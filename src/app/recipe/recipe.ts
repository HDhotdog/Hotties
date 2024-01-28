export interface Recipe {
    name: string,
    description: string,
    prepTime: string,
    ingridients: Ingridient[],
    lastEaten: Date,
    labels: Label[]
}

export interface Ingridient {
    name: string,
    shouldBuy: boolean,
}

export interface Label {
    name: string
}