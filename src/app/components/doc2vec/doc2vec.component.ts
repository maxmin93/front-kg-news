import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { of, Subscription } from 'rxjs';

import { NewsConfig } from 'src/app/app.config';
import { Document, Sentence, Token } from 'src/app/services/news-models';
import { UiApiService } from 'src/app/services/ui-api.service';
import { NewsApiService } from 'src/app/services/news-api.service';
import { DocsApiService } from 'src/app/services/docs-api.service';



@Component({
  selector: 'app-doc2vec',
  templateUrl: './doc2vec.component.html',
  styleUrls: ['./doc2vec.component.scss']
})
export class Doc2vecComponent implements OnInit {

    docid: string;
    debug: boolean = false;

    document: Document;

    // results of doc2vec
    clusters: any;
    figure_path: string;

    handler_document: Subscription;
    handler_similars: Subscription;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private newsService: NewsApiService,
        private docsService: DocsApiService
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
                this.handler_similars = this.getSimilars(this.docid);
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });

    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
        this.handler_similars.unsubscribe();
    }

    //////////////////////////////////////////////////

    getDocument(docid:string): Subscription{
        return this.newsService.getNewsById(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            this.document = x[0];
            // console.log('document:', this.document);
        });
    }

    getSimilars(docid:string): Subscription{
        return this.docsService.getDoc2Vec(docid).subscribe(x=>{
            // console.log('doc2vec:', x);
            this.figure_path = NewsConfig.URL + '/static/' + x['figure'];
            this.clusters = x['clusters'] as Map<number, Array<Array<any>>>;
            // add Document observable
            for( let [key, items] of Object.entries(this.clusters) ){
                for( let item of (<Array<Array<any>>> items) ){
                    // item: [ _id, _score, doc$ ]
                    this.newsService.getNewsById(item[0]).subscribe(x=>{
                        // console.log(item[0], item[1], x[0]);
                        (<Array<any>> item).push( of(x[0]) );
                    });
                    // let doc$ = this.newsService.getNewsById(item[0]);
                    // (<Array<any>> item).push( doc$ );
                }
            }
            console.log('clusters:', this.clusters);
        });
    }


}
