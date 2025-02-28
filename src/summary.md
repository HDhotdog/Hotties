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
- Angular 19.2
- Angular Ionic 8.4
- Typescript 5.7.2
- HTML/SCSS
- Capacitor 7.0 for native mobile features
- Angular Material 19.2
- RxJS 7.8.2
- Testing: Jasmine 5.6/Karma 6.4
- ESLint 9.21 for code quality
- PWA support via @ionic/pwa-elements 3.3
- All components are standalone components

# Important values
- The app should be usable without any internet connection
- A backend is not planned for the near future