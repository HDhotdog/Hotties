import {AppError} from '../i18n/language-pack';
export default class Optional<Type> {
  private readonly t?: Type | undefined | null;

  private constructor(t: Type | null | undefined) {
    this.t = t;
  }

  get(): Type {
    if (this.t === null || this.t === undefined) {
      throw new AppError('ui.nullPointerException', "Null Pointer Exception");
    }
    return this.t;
  }

  getOrElse(other: Type | null): Type | null {
    if (this.t === null || this.t === undefined) {
      return other;
    }
    return this.t;
  }

  /**
   * Note: Don't pass nullable to of method.<br>
   * It will throw exception.
   * If you want to use a nullable type, use ofNullable method.
   * @param t
   */
  static of<Type>(t: Type) {
    if (t === null || t === undefined) {
      throw new AppError('ui.nullPointerException', "Null Pointer Exception");
    }
    return new Optional<Type>(t);
  }

  /**
   * If a value is present, returns {@code true}, otherwise {@code false}.
   *
   * @return {@code true} if a value is present, otherwise {@code false}
   */
  public isPresent(): boolean {
    return this.t !== null && this.t !== undefined;
  }

  public ifPresent(cb: (v: Type) => void): void {
    if (this.isPresent()) {
      cb(this.get());
    }
  }

  public ifPresentOrElse(onPresent: (v: Type) => void, onNotPresent: () => void): void {
    if (this.isPresent()) {
      onPresent(this.get());
    } else {
      onNotPresent();
    }
  }

  /**
   * Returns the value if present or returns the given value "v" if not present.
   * @param v Value to return when there is no value present in the optional.
   */
  public orElse(v: Type): Type {
    if (this.isPresent()) return this.get();
    return v;
  }

  public orNull(): Type | null {
    if (this.isPresent()) return this.get();
    return null;
  }

  public orUndefined(): Type | undefined {
    if (this.isPresent()) return this.get();
    return undefined;
  }

  static ofNullable<Type>(t: Type | undefined | null) {
    return new Optional<Type>(t);
  }

  /**
   * If a value is not present, returns {@code true}, otherwise
   * {@code false}.
   *
   * @return  {@code true} if a value is not present, otherwise {@code false}
   * @since   11
   */
  public isEmpty(): boolean {
    return !this.isPresent();
  }

  public map<R>(apply: (t: Type) => R): Optional<R> {
    if (this.isPresent()) {
      return Optional.ofNullable(apply(this.get()));
    }
    return Optional.empty();
  }

  static empty<Type>(): Optional<Type> {
    return this.EMPTY;
  }

  private static EMPTY = new Optional<any>(null);

  flatMap<R>(apply: (t: Type) => Optional<R>): Optional<R> {
    if (this.isPresent()) {
      return apply(this.get());
    }
    return Optional.empty();
  }
}
