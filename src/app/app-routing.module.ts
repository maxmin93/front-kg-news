import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './components/layout/layout.component';
import { ListComponent } from './components/list/list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DetailComponent } from './components/detail/detail.component';
import { DocsComponent } from './components/docs/docs.component';
import { RegisterComponent } from './components/register/register.component';
import { BrowserComponent } from './components/browser/browser.component';
import { CanvasComponent } from './components/browser/canvas/canvas.component';
import { TextrankComponent } from './components/textrank/textrank.component';

// import { AuthGuardService } from './services/auth-guard.service';

const routes: Routes = [
  {
    path: 'list', data :{ title: "Table example" },
    component: ListComponent
  },
  {
    path: 'layout', data :{ title: "Layout Test" },
    component: LayoutComponent
  },
  {
    path: 'register', data :{ title: "Resister" },
    component: RegisterComponent
  },
  {
    path: 'textrank/:id', data :{ title: "Summary by TextRank" },
    component: TextrankComponent
  },
  {
    path: 'detail/:id', data :{ title: "Detail of Document" },
    component: DetailComponent
  },
  {
    path: 'browser/:id', data :{ title: "Graph of Document" },
    component: BrowserComponent
  },
  {
    path: 'browser', data :{ title: "Graph of Document" },
    component: BrowserComponent
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
