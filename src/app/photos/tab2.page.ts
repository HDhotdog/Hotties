import { Component } from '@angular/core';
import { PhotoService, UserPhoto } from './photo.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  constructor(public photoService: PhotoService) {}

  async ngOnInit() {
    await this.photoService.loadSaved();
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
  }

  deletePhoto(photo: UserPhoto) {
    const index = this.photoService.photos.indexOf(photo);
    this.photoService.photos.splice(index, 1);
    this.photoService.saveImages();
  }
}
