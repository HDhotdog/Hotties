import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemReorderEventDetail, IonicModule } from '@ionic/angular';
import { CategoryService } from '../../category/category.service';
import { Category } from '../../category/category.dto';

@Component({
  selector: 'app-category-setting',
  templateUrl: './category-setting.component.html',
  styleUrls: ['./category-setting.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonicModule, RouterModule],
})
export class CategorySettingComponent {
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private _categories: Category[] = [];

  async ionViewWillEnter() {
    this.categoryService.getCategories().subscribe((categories) => {
      this._categories = categories;
    });
  }

  public addNewCategory() {
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  public editCategory(id: string) {
    this.router.navigate(['new', id], { relativeTo: this.route });
  }

  public navigateBack() {
    // Explicit destination rather than Location.back() (see AddRecipeComponent for why).
    void this.router.navigate(['/tabs/settings']);
  }

  public deleteCategory(id: string) {
    this.categoryService.deleteCategory(id).subscribe();
    this._categories = this._categories.filter(
      (category) => category.id !== id
    );
  }

  // handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
  //   [this._categories[ev.detail.from], this._categories[ev.detail.to]]
  //     = [this._categories[ev.detail.to], this._categories[ev.detail.from]];
  //   this.categoryService.saveAll(this._categories).subscribe(() => {
  //     ev.detail.complete();
  //   });
  // }

  get categories(): Category[] {
    return this._categories;
  }
}
