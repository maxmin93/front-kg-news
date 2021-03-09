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
    path: 'register', data :{ title: "Resister" },
    component: RegisterComponent
  },
  {
    path: 'detail/:id', data :{ title: "Detail of Document" },
    component: DetailComponent
  },
  {
    path: 'docs', data :{ title: "Document List" },
    component: DocsComponent
  },
  {
    path: 'dashboard', data :{ title: "Dashboard" },
    component: DashboardComponent
  },
  {
    path: '', redirectTo: '/docs', pathMatch: 'full',
    // canActivate: [AuthGuardService]
  },
  // { path: '**', component: PageNotFoundComponent },  // Wildcard route for a 404 page
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
