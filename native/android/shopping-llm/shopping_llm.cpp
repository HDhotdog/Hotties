#include <jni.h>
#include <android/log.h>
#include <atomic>
#include <mutex>
#include <string>
#include <vector>
#include "llama.h"

namespace {
std::mutex model_mutex;
std::atomic<bool> cancelled{false};
llama_model * model = nullptr;
llama_context * context = nullptr;
constexpr int max_output_tokens = 400;
constexpr const char * output_grammar = R"gbnf(
root ::= "[" ws item ("," ws item){0,11} "]" ws
item ::= "{" ws "\"name\"" ws ":" ws string "," ws "\"amount\"" ws ":" ws amount "," ws "\"unit\"" ws ":" ws unit "}" ws
string ::= "\"" ([^"\\\x7F\x00-\x1F] | "\\" (["\\bfnrt] | "u" [0-9a-fA-F]{4}))* "\"" ws
amount ::= ("null" | [1-9] [0-9]* ("." [0-9]+)? | "0." [0-9]+) ws
unit ::= ("\"kg\"" | "\"g\"" | "\"l\"" | "\"ml\"" | "\"piece\"" | "\"package\"" | "\"bunch\"" | "\"pinch\"" | "null") ws
ws ::= [ \t\n]*
)gbnf";

void set_batch(llama_batch_ext * batch, const llama_token * tokens, int count, llama_pos start) {
    llama_batch_ext_clear(batch);
    for (int i = 0; i < count; ++i) {
        const int index = llama_batch_ext_add_token(batch, 0, tokens[i]);
        const llama_pos position = start + i;
        llama_batch_ext_set_pos(batch, index, &position);
    }
    llama_batch_ext_set_output_logits(batch, count - 1, true);
}

std::string chat_prompt(const std::string & sentence) {
    const std::string system = "Extract shopping items from German speech text. Output one JSON object per item inside an array. Each object has exactly name, amount, unit. Convert German number words to numbers. Keep product names without articles, quantities, fillers, or units. Units: kg, g, l, ml, piece, package, bunch, pinch, or null. For an unquantified item use amount 1 and unit null. Never invent items.";
    const std::string example = "[{\"name\":\"Kartoffeln\",\"amount\":1,\"unit\":\"kg\"},{\"name\":\"Eier\",\"amount\":1,\"unit\":\"package\"},{\"name\":\"Tomaten\",\"amount\":3,\"unit\":null}]";
    const std::string plural_example = "[{\"name\":\"Haferflocken\",\"amount\":2,\"unit\":\"package\"},{\"name\":\"Nudeln\",\"amount\":500,\"unit\":\"g\"},{\"name\":\"Petersilie\",\"amount\":1,\"unit\":\"bunch\"}]";
    const std::string user = "Text: " + sentence + "\nJSON:";
    const llama_chat_message messages[] = {
        {"system", system.c_str()},
        {"user", "Text: Ein kilo Kartoffeln, eine Packung Eier, 3 Tomaten"},
        {"assistant", example.c_str()},
        {"user", "Text: Zwei Packungen Haferflocken, 500 Gramm Nudeln und ein Bund Petersilie"},
        {"assistant", plural_example.c_str()},
        {"user", user.c_str()}
    };
    const char * tmpl = llama_model_chat_template(model, nullptr);
    std::string formatted(2 * (system.size() + example.size() + user.size()) + 512, '\0');
    int length = llama_chat_apply_template(tmpl, messages, 6, true, formatted.data(), formatted.size());
    if (length > static_cast<int>(formatted.size())) {
        formatted.resize(length);
        length = llama_chat_apply_template(tmpl, messages, 6, true, formatted.data(), formatted.size());
    }
    if (length < 0) return {};
    formatted.resize(length);
    return formatted;
}
}

extern "C" JNIEXPORT jboolean JNICALL
Java_io_ionic_hotties_LocalShoppingModelPlugin_nativeLoad(JNIEnv * env, jclass, jstring path) {
    std::lock_guard<std::mutex> lock(model_mutex);
    if (model && context) return JNI_TRUE;
    const char * filename = env->GetStringUTFChars(path, nullptr);
    static bool backend_ready = false;
    if (!backend_ready) {
        llama_backend_init();
        backend_ready = true;
    }
    auto model_params = llama_model_default_params();
    model_params.n_gpu_layers = 0;
    model = llama_model_load_from_file(filename, model_params);
    env->ReleaseStringUTFChars(path, filename);
    if (!model) return JNI_FALSE;
    auto params = llama_context_default_params();
    params.n_ctx = 2048;
    params.n_batch = 512;
    params.n_threads = 4;
    params.n_threads_batch = 4;
    context = llama_init_from_model(model, params);
    if (!context) {
        llama_model_free(model);
        model = nullptr;
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_io_ionic_hotties_LocalShoppingModelPlugin_nativeGenerate(JNIEnv * env, jclass, jstring text) {
    std::lock_guard<std::mutex> lock(model_mutex);
    if (!model || !context) return nullptr;
    cancelled = false;
    const char * input = env->GetStringUTFChars(text, nullptr);
    std::string prompt = chat_prompt(input);
    env->ReleaseStringUTFChars(text, input);
    if (prompt.empty()) return nullptr;
    const llama_vocab * vocab = llama_model_get_vocab(model);
    const int count = -llama_tokenize(vocab, prompt.c_str(), prompt.size(), nullptr, 0, true, true);
    if (count <= 0 || count + max_output_tokens >= 2048) return nullptr;
    std::vector<llama_token> tokens(count);
    if (llama_tokenize(vocab, prompt.c_str(), prompt.size(), tokens.data(), count, true, true) < 0) return nullptr;
    llama_memory_clear(llama_get_memory(context), true);
    llama_batch_ext * batch = llama_batch_ext_init(context);
    llama_sampler * sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler * grammar = llama_sampler_init_grammar(vocab, output_grammar, "root");
    if (!grammar) {
        llama_sampler_free(sampler);
        llama_batch_ext_free(batch);
        return nullptr;
    }
    llama_sampler_chain_add(sampler, grammar);
    llama_sampler_chain_add(sampler, llama_sampler_init_greedy());
    set_batch(batch, tokens.data(), count, 0);
    std::string output;
    int position = count;
    bool failed = false;
    for (int i = 0; i < max_output_tokens && !cancelled; ++i) {
        if (llama_process(context, LLAMA_PROCESS_TYPE_DECODE, batch)) {
            failed = true;
            break;
        }
        const llama_token next = llama_sampler_sample(sampler, context, -1);
        if (llama_vocab_is_eog(vocab, next)) break;
        char piece[256];
        const int size = llama_token_to_piece(vocab, next, piece, sizeof(piece), 0, true);
        if (size < 0) { failed = true; break; }
        output.append(piece, size);
        set_batch(batch, &next, 1, position++);
    }
    llama_sampler_free(sampler);
    llama_batch_ext_free(batch);
    if (failed || cancelled) return nullptr;
    return env->NewStringUTF(output.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_ionic_hotties_LocalShoppingModelPlugin_nativeCancel(JNIEnv *, jclass) {
    cancelled = true;
}
