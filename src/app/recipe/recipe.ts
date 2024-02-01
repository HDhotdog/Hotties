export interface Recipe {
    uuid: any,
    name: string,
    description: string,
    prepTimeHour: number,
    prepTimeMinutes: number,
    ingridients: Ingridient[],
    lastEaten?: Date,
    labels: Label[]
}

export interface Ingridient {
    name: string,
    shouldBuy: boolean,
}

export interface Label {
    name: string
}