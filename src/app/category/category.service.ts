import {Injectable} from '@angular/core';
import {Preferences} from '@capacitor/preferences';
import {Category} from './category';
import {Ingredient, Recipe} from '../recipe/recipe';
import {ImportanceLevel, ToDo} from '../todo/todo';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private CATEGORY_STORAGE: string = 'categories';
  private LAST_CATEGORY_INDEX: string = 'last-category';
  public categories: Category[] = [];
  public lastCategory: number = 0;

  constructor() {
  }

  public async saveCategories() {
    Preferences.set({key: this.CATEGORY_STORAGE, value: JSON.stringify(this.categories)});
    Preferences.set({key: this.LAST_CATEGORY_INDEX, value: JSON.stringify(this.lastCategory)});
  }

  public async loadCategories() {
    const {value} = await Preferences.get({key: this.CATEGORY_STORAGE})
    this.categories = (value ? JSON.parse(value) : []) as Category[];
    this.loadLastCategory();
  }

  public async clearCategories() {
    this.categories.length = 0;
    Preferences.remove({key: this.CATEGORY_STORAGE})
  }

  public async loadLastCategory() {
    const {value} = await Preferences.get({key: this.LAST_CATEGORY_INDEX})
    this.lastCategory = (value ? JSON.parse(value) : 0) as number;
  }

  public async addIngredientsToCategory(category: string, recipe: Recipe) {
    await this.loadCategories().then(() => {
      const cat = this.categories.find((cat) => cat.name === category);
      if (cat) {
        const index = this.categories.indexOf(cat);
        const toDos: ToDo[] = recipe.ingredients.map((item) => this.ingredientToTodo(item))
        toDos.forEach((toDo) => {
          this.categories[index].elements.push(toDo);
        });

        this.saveCategories();
      }
    })
  }

  private ingredientToTodo(ingredient: Ingredient): ToDo {
    return {
      task: ingredient.name,
      done: false,
      importance: ImportanceLevel.NORMAL
    }
  }
}
