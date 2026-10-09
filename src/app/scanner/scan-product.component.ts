import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHintALLOption,
} from '@capacitor/barcode-scanner';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { FridgeService } from '../fridge/fridge.service';
import { ItemService } from '../item/item.service';
import { Item } from '../item/models/item.dto';
import { OpenFoodFactsService, ProductLookupError } from './open-food-facts.service';

type ScanState = 'idle' | 'scanning' | 'looking-up' | 'saving';

@Component({
  selector: 'app-scan-product',
  standalone: true,
  templateUrl: './scan-product.component.html',
  styleUrls: ['./scan-product.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSpinner, IonTitle, IonToolbar],
})
export class ScanProductComponent {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly products = inject(OpenFoodFactsService);
  private readonly items = inject(ItemService);
  private readonly fridge = inject(FridgeService);

  public barcodeInput = '';
  public state: ScanState = 'idle';
  public errorMessage: string | null = null;
  public savedName: string | null = null;
  public readonly nativeScanner = Capacitor.isNativePlatform();

  ionViewDidEnter(): void {
    if (this.nativeScanner && !this.savedName && this.state === 'idle') {
      void this.scan();
    }
  }

  public async scan(): Promise<void> {
    if (this.state !== 'idle') return;
    this.setState('scanning');
    this.errorMessage = null;
    this.savedName = null;
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanInstructions: 'Point the camera at a food product barcode',
        cancelButtonAccessibilityLabel: 'Cancel barcode scan',
        torchButtonOnAccessibilityLabel: 'Turn flashlight off',
        torchButtonOffAccessibilityLabel: 'Turn flashlight on',
      });
      if (result.ScanResult) {
        this.barcodeInput = result.ScanResult;
        await this.addBarcode(result.ScanResult);
      }
    } catch (error) {
      // Closing the native scanner is a normal path. Keep the manual option visible.
      if (!String(error).toLowerCase().includes('cancel')) {
        this.errorMessage = 'Could not open the camera. You can enter the barcode below.';
      }
    } finally {
      this.setState('idle');
    }
  }

  public async addBarcode(value: string): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'scanning') return;
    const barcode = value.trim();
    if (!/^\d{8,14}$/.test(barcode)) {
      this.errorMessage = 'Enter a valid 8–14 digit food barcode.';
      this.setState('idle');
      return;
    }
    this.errorMessage = null;
    this.savedName = null;
    this.setState('looking-up');
    try {
      // Existing items are the local product cache and work without an internet connection.
      let item: Item | null = await firstValueFrom(this.items.findByBarcode(barcode));
      if (!item) {
        const product = await this.products.getProduct(barcode);
        this.setState('saving');
        item = await firstValueFrom(this.items.saveScannedProduct(product));
      }
      this.setState('saving');
      await firstValueFrom(this.fridge.save({
        id: uuidv4(),
        itemId: item.id,
        name: item.name,
        amount: item.unit,
        quantity: 1,
        expiryDate: null,
      }));
      this.savedName = item.name;
      this.barcodeInput = '';
    } catch (error) {
      this.errorMessage = error instanceof ProductLookupError ? error.message : 'Could not save this product. Please try again.';
    } finally {
      this.setState('idle');
    }
  }

  public backToShopping(): void {
    void this.router.navigate(['/tabs/todo']);
  }

  public viewFridge(): void {
    void this.router.navigate(['/tabs/fridge']);
  }

  public addManually(): void {
    void this.router.navigate(['/tabs/fridge/new']);
  }

  private setState(state: ScanState): void {
    this.state = state;
    this.cdr.markForCheck();
  }
}
