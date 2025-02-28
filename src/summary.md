# App summary
This Android application was made to help the user to store and manage cooking recipes. It also provides a shopping list functionality which works basically like a ToDo list with items that can be created and ticked once they're resolved.

# Features
## Shopping List
- Provides a list of items that can be entered by the user or exported from existing recipes
- Multiple categories which can be edited by the user which can represent different supermarkets, stores, etc.
- Each category contains it's own shopping list
- The user can give items different priorities which are then represented by colors
- Clicking on an item removes the item
- There is a button to remove all items of a list/category and empty it completely

## Recipes
- The user can create recipes which contain basic information like ingridients, cooking steps, duration, pictures, etc
- Each recipe can have muliple labels which can represent the flavor or type of food
- All recipes are visible in a container like list which is scrollable
- The user can filter by label or use the search bar to find specific types of food


## Setting
- a setting tab where categories can be created and edited
- functionality to clear the application cache


# Tech Stack
- Angular 17
- Angular Ionic 7
- Typescript 5.2
- HTML/SCSS
- Capacitor 5.5 for native mobile features
- Angular Material 17
- RxJS 7.8
- Testing: Jasmine/Karma
- ESLint for code quality
- PWA support via @ionic/pwa-elements

# Important values
- The app should be usable without any internet connection
- A backend is not planned for the near future