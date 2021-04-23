import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Document, Sentence, Token } from 'src/app/services/news-models';
import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-textrank',
  templateUrl: './textrank.component.html',
  styleUrls: ['./textrank.component.scss']
})
export class TextrankComponent implements OnInit, OnDestroy {

    typesOfShoes: string[] = ['Boots', 'Clogs', 'Loafers', 'Moccasins', 'Sneakers'];

    docid: string;
    debug: boolean = false;

    document_content:string = 'ABC<mark>EFG</mark>HIJ';
    document: Document;
    sentences: any[];
    handler_document: Subscription;
    handler_sentences: Subscription;

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
                // loading data
                this.handler_document = this.getDocument(this.docid);
                this.handler_sentences = this.getSentences(this.docid);
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });

    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
        this.handler_sentences.unsubscribe();
    }

    //////////////////////////////////////////////////

    getDocument(docid:string): Subscription{
        return this.newsService.getNewsById(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            this.document = x[0];
            this.document_content = this.document.content;
            // console.log('document:', this.document);
        });
    }

    getSentences(docid:string): Subscription{
        return this.newsService.getTextRank(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            // console.log('sentences:', x);
            this.sentences = x;
        });
    }

    highlight(term:string){
        const re = new RegExp(`(${ term })`, 'gi');
        let text = this.document.content;
        this.document_content = text.replace(re, `<mark>${term}</mark>`);
    }

}
