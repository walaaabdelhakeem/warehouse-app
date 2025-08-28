import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PurchaseOrdersComponent } from './components/purchase-orders/purchase-orders.component'; // ✅ Update if path is different
import { CommonModule } from '@angular/common';
import { OpeningBalancesComponent } from './components/opening-balances/opening-balances.component';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AppComponent,
    LoginComponent,
    PurchaseOrdersComponent,
    OpeningBalancesComponent
  ],
  exports: [
    PurchaseOrdersComponent // لو محتاج تصدّره
  ]
})

export class AppModule {}
