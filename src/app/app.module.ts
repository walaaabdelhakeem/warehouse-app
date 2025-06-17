import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PurchaseOrdersComponent } from './components/purchase-orders/purchase-orders.component'; // ✅ Update if path is different
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PurchaseOrdersComponent 
  ],

  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    CommonModule
    
  ],
  exports: [PurchaseOrdersComponent],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
