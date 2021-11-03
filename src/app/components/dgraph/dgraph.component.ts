import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';

import { NewsConfig } from 'src/app/app.config';
import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { Document, Sentence, Token } from 'src/app/services/news-models';
import { DocsApiService } from 'src/app/services/docs-api.service';


@Component({
  selector: 'app-dgraph',
  templateUrl: './dgraph.component.html',
  styleUrls: ['./dgraph.component.scss']
})
export class DgraphComponent implements OnInit {

    document_content:string = 'ABC<mark>EFG</mark>HIJ';

    docid: string;
    document: Document;
    sentences: Sentence[] = [];

    spinning: boolean = true;

    dgraph: any;
    dgraph_origin: Observable<any>;
    dgraph_simplified: Observable<any>;
    subgraphs_pruned: Observable<any>[];
    subgraphs_origin: Observable<any>[];

    image_path: string = NewsConfig.URL + '/static/';
    imagesrc_pruned: Observable<string>[];
    panelstate_pruned: boolean[] = [];
    panelstate_origin: boolean[] = [];

    debug: boolean = false;
    handler_document:Subscription;
    handler_sentences:Subscription;
    handler_dgraph:Subscription;
    handler_dgraph_sub:Subscription;

    @ViewChild('accordPruned') accordPruned: MatAccordion;
    @ViewChild('accordOrigin') accordOrigin: MatAccordion;
    @ViewChild('content', {static: false}) private content: ElementRef;

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
                this.handler_sentences = this.getSentences(this.docid);
                this.handler_dgraph = this.getDocGraph(this.docid);
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });
    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
        this.handler_sentences.unsubscribe();
        this.handler_dgraph.unsubscribe();
    }

    goSource(){
        window.open(this.document.out_link,'name','width=600,height=400')
    }

    //////////////////////////////////////////////

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
        return this.newsService.getSentences(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('sentences:', x);
            this.sentences = x;
        });
    }

    //////////////////////////////////////////////

    getDocGraph(docid:string): Subscription{
        return this.docsService.getDgraphDoc(docid).subscribe(x=>{
            if( !x || Object.keys(x).length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('Dgraph:', x);
            this.dgraph = x;
            this.dgraph_origin = of(x);
            // this.dgraph_simplified = this.docsService.getDgraphDocSimplified(docid);

            // subgaphs
            this.subgraphs_pruned = Array<Observable<any>>();
            this.subgraphs_origin = Array<Observable<any>>();
            for( let idx of Object.keys(x['roots']) ){
                this.subgraphs_pruned.push( this.docsService.getDgraphDocSub(docid, idx, true) );
                this.subgraphs_origin.push( this.docsService.getDgraphDocSub(docid, idx, false) );
                // this.subgraphs_origin.push( undefined );

                this.panelstate_pruned.push(false);
                this.panelstate_origin.push(false);
            }

            setTimeout(()=>{
                this.spinning = false;
            }, 2000);       // image 전송시간 고려
        });
    }

    getDocGraphSub(docid:string, idx:string, pruned:boolean, subgaphs:Map<string, any>): Subscription{
        return this.docsService.getDgraphDocSub(docid, idx, pruned).subscribe(x=>{
            if( !x || Object.keys(x).length == 0 ){
                console.log(`Empty response by docid=[${docid}], idx=[${idx}]`);
            }
            console.log('DgraphSub:', x);
            subgaphs.set(idx, x);
        });
    }

    // figurePath(fname): string{
    //     return NewsConfig.URL + '/static/' + fname;
    // }

    figurePanelState(idx:number, ftype:string, opened:boolean){
        // if(opened) console.log(idx, ftype, opened);
        if(ftype == 'pruned'){
            this.panelstate_pruned[idx] = opened;
        }
        else{
            // this.subgraphs_origin[idx] = this.docsService.getDgraphDocSub(this.docid, idx.toString(), false);
            this.panelstate_origin[idx] = opened;
        }
    }

    /////////////////////////////////

    openAllaccordPruned(){
        this.accordPruned.openAll();
    }
    openAllaccordOrigin(){
        this.accordOrigin.openAll();
    }
    closeAllaccordPruned(){
        this.accordPruned.closeAll();
    }
    closeAllaccordOrigin(){
        this.accordOrigin.closeAll();
    }
}
