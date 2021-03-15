import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { Document, Sentence, Term } from 'src/app/services/news-models';


// https://cloud.google.com/natural-language/docs/reference/rest/v1/Token?hl=ko-kr&skip_cache=true
const POS_TAGS = {
    'NOUN': ['명사', 'Noun (common and proper)'],     // '일반명사, 고유명사, 의존명사'
    'VERB': ['동사', 'Verb (all tenses and modes)'],
    'ADJ': ['형용사', 'Adjective'],
    'ADP': ['부치사', 'Adposition (preposition and postposition): ~에, ~으로'],
    'ADV': ['부사', 'Adverb'],
    'AFFIX': ['접사', 'Affix: 접두사, 접미사, 접요사'],
    'CONJ': ['접속사', 'Conjunction'],
    'DET': ['한정사', 'Determiner'],
    'NUM': ['숫자', 'Cardinal number'],
    'PRON': ['대명사', 'Pronoun'],
    'PRT': ['분사', 'Particle or other function word'],
    'PUNCT': ['마침표', 'Punctuation'],
    'X': ['미분류', 'Other: foreign words, typos, abbreviations'],
    'UNKNOWN': ['분류안됨','Unknown']
};

// https://cloud.google.com/natural-language/docs/reference/rest/v1/Entity
const ENTITY_TAGS = {
    'PERSON': ['인물', 'Person'],     // '일반명사, 고유명사, 의존명사'
    'LOCATION': ['지명', 'Location'],
    'ORGANIZATION': ['기관/조직', 'Organization'],
    'EVENT': ['사건/행사', 'Event'],
    'WORK_OF_ART': ['예술품', 'Artwork'],
    'CONSUMER_GOOD': ['상품', 'Consumer product'],
    'PHONE_NUMBER': ['전화번호', 'Phone number'],
    'ADDRESS': ['주소/행정구역', 'Address'],
    'DATE': ['날짜', 'Date'],
    'NUMBER': ['숫자', 'Pronoun'],
    'PRICE': ['가격', 'Price'],
    'OTHER': ['미분류', 'Other types of entities'],
    'UNKNOWN': ['분류안됨','Unknown']
};

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit, OnDestroy {

    document_content:string = 'ABC<mark>EFG</mark>HIJ';

    docid: string;
    document: Document;
    sentences: Sentence[] = [];
    agg_terms: any;
    entity_nouns: any;
    nouns: Term[] = []
    pos_map: Map<string, any> = new Map();

    debug: boolean = false;
    handler_document:Subscription;
    handler_sentences:Subscription;
    handler_agg_terms:Subscription;
    handler_entity_nouns:Subscription;

    @ViewChild('accordPos') accordPos: MatAccordion;
    @ViewChild('accordEntity') accordEntity: MatAccordion;
    @ViewChild('content', {static: false}) private content: ElementRef;

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
                this.handler_agg_terms = this.getAggTerms(this.docid);
                this.handler_entity_nouns = this.getEntityNouns(this.docid);
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });
    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
        this.handler_agg_terms.unsubscribe();
        this.handler_entity_nouns.unsubscribe();
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

    getAggTerms(docid:string): Subscription{
        return this.newsService.getAggTerms(docid).subscribe((x:any)=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('agg_terms:', x);
            this.agg_terms = x;
        });
    }

    pos_ko(tag:string): string[]{
        return tag in POS_TAGS ? POS_TAGS[tag] : POS_TAGS['UNKNOWN'];
    }

    highlight(term:string){
        const re = new RegExp(`(${ term })`, 'gi');
        let text = this.document.content;
        this.document_content = text.replace(re, `<mark>${term}</mark>`);
    }

    getEntityNouns(docid:string): Subscription{
        return this.newsService.getEntityNouns(docid).subscribe(x=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('entity_nouns:', x);
            this.entity_nouns = x;
        });
    }

    entity_ko(tag:string): string[]{
        return tag in ENTITY_TAGS ? ENTITY_TAGS[tag] : ENTITY_TAGS['UNKNOWN'];
    }

    /////////////////////////////////

    openAllaccordPos(){
        this.accordPos.openAll();
    }
    openAllaccordEntity(){
        this.accordEntity.openAll();
    }
    closeAllaccordPos(){
        this.accordPos.closeAll();
    }
    closeAllaccordEntity(){
        this.accordEntity.closeAll();
    }
}
