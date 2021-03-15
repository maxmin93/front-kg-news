import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Document, Sentence, Term } from 'src/app/services/news-models';
import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-textrank',
  templateUrl: './textrank.component.html',
  styleUrls: ['./textrank.component.scss']
})
export class TextrankComponent implements OnInit, OnDestroy {

    docid: string;
    debug: boolean = false;

    document_content:string = 'ABC<mark>EFG</mark>HIJ';
    document: Document;
    handler_document:Subscription;

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
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });

    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
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

}
