import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// import { AuthGuardService } from './services/auth-guard.service';

import { LayoutComponent } from './components/layout/layout.component';
import { ListComponent } from './components/list/list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DetailComponent } from './components/detail/detail.component';
import { DocsComponent } from './components/docs/docs.component';
import { RegisterComponent } from './components/register/register.component';
import { TextrankComponent } from './components/textrank/textrank.component';

import { BrowserComponent } from './components/browser/browser.component';
// import { CanvasComponent } from './components/browser/canvas/canvas.component';
import { N2vBrowserComponent } from './components/n2v-browser/n2v-browser.component';
import { Doc2vecComponent } from './components/doc2vec/doc2vec.component';
import { DgraphComponent } from './components/dgraph/dgraph.component';


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
    path: 'doc2vec/:id', data :{ title: "Similar Documents and Clustering" },
    component: Doc2vecComponent
  },
  {
    path: 'dgraph/:id', data :{ title: "Dependency Graph of Document" },
    component: DgraphComponent
  },
  {
    path: 'detail/:id', data :{ title: "Detail of Document" },
    component: DetailComponent
  },
  {
    path: 'browser', data :{ title: "Demo page (word2vec)" },
    component: BrowserComponent
  },
  {
    path: 'n2v-browser/:pivot', data :{ title: "Word Graph (node2vec)" },
    component: N2vBrowserComponent
  },
  {
    path: 'n2v-browser', data :{ title: "Word Graph (node2vec)" },
    component: N2vBrowserComponent
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
