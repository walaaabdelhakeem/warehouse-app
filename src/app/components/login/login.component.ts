import { Component,OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
// ...existing code...
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMsg: string = '';
  submitted = false;

  constructor( 
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          Validators.pattern('^[a-zA-Z0-9_]+$')
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(32)
        ]
      ]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      this.errorMsg = 'يرجى تعبئة جميع الحقول بشكل صحيح';
      return;
    }
    const { username, password } = this.loginForm.value;
    this.auth.login({ username, password }).subscribe({
     next: (res) => {
          
          if (res.success ) {
        this.errorMsg = '';
        this.auth.setLocalstorgeToken(res.data.token)
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMsg = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      }
    }});
  }
}
