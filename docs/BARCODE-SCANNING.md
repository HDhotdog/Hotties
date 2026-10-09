# Barcode scanning plan and implementation

## Flow

1. The shopping list toolbar opens `/tabs/todo/scan`.
2. On a phone, the scan page opens the native camera scanner. A manual barcode field remains available if camera access fails or the code cannot be read.
3. The barcode is validated as 8–14 digits and checked against the local `items` collection. A cached item needs no network request.
4. For a new barcode, the app requests only `code,product_name,generic_name,brands,quantity` from the Open Food Facts v3 product endpoint. The response creates an `items` row with the barcode, name, brand, and package quantity. A scan represents one package. It then creates a `fridge_items` row linked by `itemId`, with quantity one and no guessed expiry date.
5. The page confirms the saved product and offers another scan or a link to the fridge. Failed lookups and saves leave the fridge unchanged and show a retry path.

## API policy

Open Food Facts currently allows 15 product reads per minute per IP. The app reserves at most 14 new lookups in a rolling minute, stores timestamps locally across restarts, does not retry 429/503 automatically, and pauses new reads for a minute after either response. Existing barcodes use local product data. Native HTTP sends `Hotties/<app version> (https://github.com/HDhotdog/Hotties)` as User-Agent. The browser build cannot set that header, so remote lookup is available in the installed mobile app only.

Product information is community maintained and can be missing. The app does not infer expiry or nutrition values, and a missing product is not silently saved as an identified item. The fridge and shopping list otherwise remain local.

## Native setup

The native projects are gitignored. After `npx cap add android` or `npx cap add ios`, run `npm run native:configure` before `npx cap sync`. `npm run export` does this automatically for Android. This sets Android min SDK 26 and CAMERA/INTERNET permissions, and adds the iOS camera usage text. Then build and test on a physical phone; a web build cannot verify the native camera or User-Agent behavior.

The Open Food Facts product API and its current limits are documented at <https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/>. The v3 barcode endpoint is documented at <https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/>.
