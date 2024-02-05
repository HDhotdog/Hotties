export interface Recipe {
  uuid: any,
  name: string,
  description: string,
  prepTimeHour: number,
  prepTimeMinutes: number,
  ingredients: Ingredient[],
  lastEaten?: Date,
  labels: Label[]
}

export interface Ingredient {
  name: string,
  shouldBuy: boolean
}

export interface Label {
  name: string
}

export interface LabelGroup {
  name: string,
  labels: Label[]
}
