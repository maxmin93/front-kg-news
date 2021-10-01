import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material Components
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

// services
import { NewsApiService } from './services/news-api.service';
import { UiApiService } from './services/ui-api.service';
import { ColorProviderService } from './services/color-provider.service';

// components
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LayoutModule } from '@angular/cdk/layout';
import { ListComponent } from './components/list/list.component';
import { RegisterComponent } from './components/register/register.component';
import { DocsComponent } from './components/docs/docs.component';
import { DetailComponent } from './components/detail/detail.component';
import { LayoutComponent } from './components/layout/layout.component';
import { TextrankComponent } from './components/textrank/textrank.component';

import { BrowserComponent } from './components/browser/browser.component';
import { CanvasComponent } from './components/browser/canvas/canvas.component';
import { N2vBrowserComponent } from './components/n2v-browser/n2v-browser.component';
import { VocabDialogComponent } from './components/n2v-browser/vocab-dialog/vocab-dialog.component';
import { Doc2vecComponent } from './components/doc2vec/doc2vec.component';
import { DgraphComponent } from './components/dgraph/dgraph.component';
import { DtriplesComponent } from './components/dtriples/dtriples.component';
import { QtriplesComponent } from './components/qtriples/qtriples.component';
import { TGraphComponent } from './components/tgraph/tgraph.component';


// ** if you miss "--routing" option:
// 0) ng generate module app-routing --flat --module=app

// 1) ng add @angular/material
// 2) npm i -s @angular/flex-layout @angular/cdk
// 3) npm install angular-gridster2 --save
// 4) npm i -s leaflet

// ** pre-built components:
// https://material.angular.io/guide/schematics#component-schematics

// ng generate @angular/material:dashboard components/dashboard --skip-tests
// ng generate @angular/material:table components/list --skip-tests
// ng generate @angular/material:address-form components/register --skip-tests

// ** for login
// ng generate guard auth-guard

@NgModule({
    declarations: [
        AppComponent,
        DashboardComponent,
        ListComponent,
        RegisterComponent,
        DocsComponent,
        DetailComponent,
        LayoutComponent,
        TextrankComponent,
        BrowserComponent,
        CanvasComponent,
        // W2vBrowserComponent,
        // W2vCanvasComponent,
        VocabDialogComponent,
        Doc2vecComponent,
        N2vBrowserComponent,
        DgraphComponent,
        DtriplesComponent,
        QtriplesComponent,
        TGraphComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        AppRoutingModule,

        // chart.js
        // ChartsModule,

        // Materials
        MatBadgeModule,
        MatCheckboxModule,
        MatCheckboxModule,
        MatButtonModule,
        MatInputModule,
        MatAutocompleteModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatRadioModule,
        MatSelectModule,
        MatSliderModule,
        MatSlideToggleModule,
        MatMenuModule,
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatGridListModule,
        MatCardModule,
        MatStepperModule,
        MatTabsModule,
        MatExpansionModule,
        MatButtonToggleModule,
        MatChipsModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatDialogModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        LayoutModule
    ],
    providers: [
        Title,
        UiApiService,
        NewsApiService,
        ColorProviderService,
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'fill' } },
    ],
    bootstrap: [
        AppComponent
    ],
    entryComponents: [AppComponent, VocabDialogComponent],
})
export class AppModule { }
