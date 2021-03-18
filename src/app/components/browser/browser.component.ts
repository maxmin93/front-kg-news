import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { NewsApiService } from 'src/app/services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { Document, Sentence, Term } from 'src/app/services/news-models';

import tippy from 'tippy.js';

// declare const tippy:any;


@Component({
    selector: 'app-browser',
    templateUrl: './browser.component.html',
    styleUrls: ['./browser.component.scss']
})
export class BrowserComponent implements OnInit, OnDestroy, AfterViewInit {

    showSearch: boolean = false;
    searchStr: string;

    docid: string;
    document: Document;
    sentences: Sentence[] = [];
    terms: Term[] = []

    debug: boolean = false;
    handler_document:Subscription;
    handler_sentences:Subscription;
    handler_terms:Subscription;

    @ViewChild('tippy_test', {static: false}) private tippy_test: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private newsService: NewsApiService
    ) { }

    ngOnInit(): void {
        // parameters of routes
        this.route.paramMap.subscribe(params => {
            // console.log('paramMap:', params.get('id'));
            this.docid = params.get('id');
            console.log('docid:', this.docid);

            if( this.docid ){
                // data of routes
                this.route.data.subscribe(data => {
                    data['docid'] = this.docid;
                    this.uiService.pushRouterData(data);
                });
                // get data
                this.handler_document = this.getDocument(this.docid);
                this.handler_sentences = this.getSentences(this.docid);
                this.handler_terms = this.getTerms(this.docid);
            }
            else{
                // data of routes
                this.route.data.subscribe(data => this.uiService.pushRouterData(data));
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });

    }

    ngAfterViewInit(): void{
        tippy( this.tippy_test.nativeElement, {
            content: 'My tooltip!',
            theme: 'light',
            placement: 'top-start',
            arrow: true,
        });
    }

    ngOnDestroy(): void{
        if(this.handler_document) this.handler_document.unsubscribe();
        if(this.handler_sentences) this.handler_sentences.unsubscribe();
        if(this.handler_terms) this.handler_terms.unsubscribe();
    }

    goSource(){
        window.open(this.document.link,'name','width=600,height=400')
    }

    //////////////////////////////////////////////

    getDocument(docid:string): Subscription{
        return this.newsService.getNewsById(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            this.document = x[0];
            // console.log('document:', this.document);
        });
    }

    getSentences(docid:string): Subscription{
        return this.newsService.getSentences(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('sentences:', x);
            this.sentences = x;
        });
    }

    getTerms(docid:string): Subscription{
        return this.newsService.getTerms(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('terms:', x);
            this.terms = x;
        });
    }

    //////////////////////////////////////////////

    searchToggle(value:boolean){
        this.showSearch = value;
    }

    searchSubmit(){
        console.log('searchStr:', this.searchStr);
        this.searchToggle(false);
    }

}
