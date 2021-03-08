import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListComponent } from './components/list/list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DetailComponent } from './components/detail/detail.component';
import { DocsComponent } from './components/docs/docs.component';
import { RegisterComponent } from './components/register/register.component';

// import { AuthGuardService } from './services/auth-guard.service';

const routes: Routes = [
  // {
  //   path: 'login',
  //   component: LoginComponent
  // },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'detail/:id',
    component: DetailComponent
  },
  {
    path: 'docs',
    component: DocsComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: '', redirectTo: '/docs', pathMatch: 'full',
    // canActivate: [AuthGuardService]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
