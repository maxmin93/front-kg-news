import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { Document, Sentence, Token } from 'src/app/services/news-models';


// https://cloud.google.com/natural-language/docs/reference/rest/v1/Token?hl=ko-kr&skip_cache=true#label
// https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=yoojung428&logNo=221342972294
const DTAG_TAGS = {
    'UNKNOWN':	    ['분류안됨', 'Unknown'],
    'ABBREV':	    ['약어 수식어', 'Abbreviation modifier'],
    'ACOMP':	    ['형용사 보어', 'Adjectival complement'],
    'ADVCL':	    ['부사 보조', 'Adverbial clause modifier'],
    'ADVMOD':	    ['부사 수식어', 'Adverbial modifier'],
    'AMOD':	        ['명사구의 형용사 수식어', 'Adjectival modifier of an NP'],
    'APPOS':	    ['명사구의 동격 수식어', 'Appositional modifier of an NP'],
    'ATTR':	        ['동사 보조', 'Attribute dependent of a copular verb'],
    'AUX':	        ['보조 동사', 'Auxiliary (non-main) verb'],
    'AUXPASS':	    ['수동 보조', 'Passive auxiliary'],
    'CC':	        ['조정', 'Coordinating conjunction'],
    'CCOMP':	    ['동사/형용사절 보어', 'Clausal complement of a verb or adjective'],
    'CONJ':	        ['결합', 'Conjunct'],
    'CSUBJ':	    ['절 주제', 'Clausal subject'],
    'CSUBJPASS':	['절 수동 주제', 'Clausal passive subject'],
    'DEP':	        ['종속', 'Dependency (unable to determine)'],
    'DET':	        ['결정자', 'Determiner'],
    'DISCOURSE':	['담화', 'Discourse'],
    'DOBJ':	        ['직접 목적어', 'Direct object'],
    'EXPL':	        ['조어', 'Expletive'],
    'GOESWITH':	    ['다음과 함께 사용 (잘린 단어)', 'Goes with (part of a word in a text not well edited)'],
    'IOBJ':	        ['간접 목적어', 'Indirect object'],
    'MARK':	        ['마커 (하위절)', 'Marker (word introducing a subordinate clause)'],
    'MWE':	        ['다중단어 표현', 'Multi-word expression'],
    'MWV':	        ['다중단어 언어표현', 'Multi-word verbal expression'],
    'NEG':	        ['부정 수식어', 'Negation modifier'],
    'NN':	        ['명사 복합 수식어', 'Noun compound modifier'],
    'NPADVMOD':	    ['부사 수식어로 사용되는 명사구', 'Noun phrase used as an adverbial modifier'],
    'NSUBJ':	    ['명목상 주어', 'Nominal subject'],
    'NSUBJPASS':	['수동적인 명목상 주어', 'Passive nominal subject'],
    'NUM':	        ['숫자 수식어', 'Numeric modifier of a noun'],
    'NUMBER':	    ['숫자', 'Element of compound number'],
    'P':	        ['구두점', 'Punctuation mark'],
    'PARATAXIS':	['줄임말', 'Parataxis relation'],
    'PARTMOD':	    ['참여 수식어', 'Participial modifier'],
    'PCOMP':	    ['전치사 보어', 'The complement of a preposition is a clause'],
    'POBJ':	        ['전치사 목적어', 'Object of a preposition'],
    'POSS':	        ['소유격 수식어', 'Possession modifier'],
    'POSTNEG':	    ['부정적 의미 조사', 'Postverbal negative particle'],
    'PRECOMP':	    ['술어 보어', 'Predicate complement'],
    'PRECONJ':	    ['결막 전', 'Preconjunt'],
    'PREDET':	    ['사전 결정자', 'Predeterminer'],
    'PREF':	        ['접두사', 'Prefix'],
    'PREP':	        ['전치사 수식어', 'Prepositional modifier'],
    'PRONL':	    ['동사 형태 보조', 'The relationship between a verb and verbal morpheme'],
    'PRT':	        ['조사', 'Particle'],
    'PS':	        ['연관성/소유성 마커', 'Associative or possessive marker'],
    'QUANTMOD':	    ['정량화 구 수식어', 'Quantifier phrase modifier'],
    'RCMOD':	    ['관계절 수식어', 'Relative clause modifier'],
    'RCMODREL':	    ['관계절의 보어', 'Complementizer in relative clause'],
    'RDROP':	    ['줄임표 (선행조건자가 없는)', 'Ellipsis without a preceding predicate'],
    'REF':	        ['참조', 'Referent'],
    'REMNANT':	    ['잔여절', 'Remnant'],
    'REPARANDUM':	['배상', 'Reparandum'],
    'ROOT':	        ['문장 머리', 'Root'],
    'SNUM':	        ['숫자 단위 접미사', 'Suffix specifying a unit of number'],
    'SUFF':	        ['접미사', 'Suffix'],
    'TMOD':	        ['시간 수식어', 'Temporal modifier'],
    'TOPIC':	    ['주제 마커', 'Topic marker'],
    'VMOD':	        ['명사 수식절의 동사 보조', 'Clause headed by an infinite form of the verb that modifies a noun'],
    'VOCATIVE':	    ['부르는', 'Vocative'],
    'XCOMP':	    ['개방절 보어', 'Open clausal complement'],
    'SUFFIX':	    ['이름 접미사', 'Name suffix'],
    'TITLE':	    ['이름 타이틀', 'Name title'],
    'ADVPHMOD':	    ['부사구 수식어', 'Adverbial phrase modifier'],
    'AUXCAUS':	    ['원인 보조', 'Causative auxiliary'],
    'AUXVV':	    ['도우미 보조', 'Helper auxiliary'],
    'DTMOD':	    ['전치 명사 수식어', 'Rentaishi (Prenominal modifier)'],
    'FOREIGN':	    ['외국어', 'Foreign words'],
    'KW':	        ['키워드', 'Keyword'],
    'LIST':	        ['항목 리스트', 'List for chains of comparable items'],
    'NOMC':	        ['명목화된 조항', 'Nominalized clause'],
    'NOMCSUBJ':	    ['명목화된 주어', 'Nominalized clausal subject'],
    'NOMCSUBJPASS':	['명목화된 형용절', 'Nominalized clausal passive'],
    'NUMC':	        ['숫자 수식어 결합', 'Compound of numeric modifier'],
    'COP':	        ['접합부', 'Copula'],
    'DISLOCATED':	['주제/앞면 관계', 'Dislocated relation (for fronted/topicalized elements)'],
    'ASP':	        ['상황적 표지', 'Aspect marker'],
    'GMOD':	        ['여격/속격 수식어', 'Genitive modifier'],
    'GOBJ':	        ['여격/속격 객체', 'Genitive object'],
    'INFMOD':	    ['부정사 수식어', 'Infinitival modifier'],
    'MES':	        ['단위', 'Measure'],
    'NCOMP':	    ['명사의 명목화 보어', 'Nominal complement of a noun']
};

// https://cloud.google.com/natural-language/docs/reference/rest/v1/Token?hl=ko-kr&skip_cache=true
const POS_TAGS = {
    'NOUN':         ['명사', 'Noun (common and proper)'],     // '일반명사, 고유명사, 의존명사'
    'VERB':         ['동사', 'Verb (all tenses and modes)'],
    'ADJ':          ['형용사', 'Adjective'],
    'ADP':          ['부치사', 'Adposition (preposition and postposition): ~에, ~으로'],
    'ADV':          ['부사', 'Adverb'],
    'AFFIX':        ['접사', 'Affix: 접두사, 접미사, 접요사'],
    'CONJ':         ['접속사', 'Conjunction'],
    'DET':          ['한정사', 'Determiner'],
    'NUM':          ['숫자', 'Cardinal number'],
    'PRON':         ['대명사', 'Pronoun'],
    'PRT':          ['분사', 'Particle or other function word'],
    'PUNCT':        ['마침표', 'Punctuation'],
    'X':            ['미분류', 'Other: foreign words, typos, abbreviations'],
    'UNKNOWN':      ['분류안됨','Unknown']
};

// https://cloud.google.com/natural-language/docs/reference/rest/v1/Entity
const ENTITY_TAGS = {
    'PERSON':       ['인물', 'Person'],     // '일반명사, 고유명사, 의존명사'
    'LOCATION':     ['지명', 'Location'],
    'ORGANIZATION': ['기관/조직', 'Organization'],
    'EVENT':        ['사건/행사', 'Event'],
    'WORK_OF_ART':  ['예술품', 'Artwork'],
    'CONSUMER_GOOD':['상품', 'Consumer product'],
    'PHONE_NUMBER': ['전화번호', 'Phone number'],
    'ADDRESS':      ['주소/행정구역', 'Address'],
    'DATE':         ['날짜', 'Date'],
    'UNIT':         ['단위', 'Unit'],
    'NUMBER':       ['숫자', 'Pronoun'],
    'PRICE':        ['가격', 'Price'],
    'OTHER':        ['미분류', 'Other types of entities'],
    'UNKNOWN':      ['분류안됨','Unknown']
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
    agg_terms: any;         // POS
    dtag_terms: any;        // D_TAG
    entity_nouns: any;
    nouns: Token[] = []
    pos_map: Map<string, any> = new Map();

    debug: boolean = false;
    handler_document:Subscription;
    handler_sentences:Subscription;
    handler_agg_terms:Subscription;
    handler_dtag_terms:Subscription;
    handler_entity_nouns:Subscription;

    @ViewChild('accordPos') accordPos: MatAccordion;
    @ViewChild('accordDtag') accordDtag: MatAccordion;
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
                this.handler_dtag_terms = this.getDtagTerms(this.docid);
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
        this.handler_dtag_terms.unsubscribe();
        this.handler_entity_nouns.unsubscribe();
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

    getAggTerms(docid:string): Subscription{
        return this.newsService.getAggTerms(docid).subscribe((x:any)=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            // console.log('agg_terms:', x);
            this.agg_terms = x;
        });
    }

    getDtagTerms(docid:string): Subscription{
        return this.newsService.getDtagTerms(docid).subscribe((x:any)=>{
            if( x.length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            // console.log('dtag_terms:', x);
            this.dtag_terms = x;
        });
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
            // console.log('entity_nouns:', x);
            this.entity_nouns = x;
        });
    }

    pos_ko(tag:string): string[]{
        return tag in POS_TAGS ? POS_TAGS[tag] : POS_TAGS['UNKNOWN'];
    }

    dtag_ko(tag:string): string[]{
        return tag in DTAG_TAGS ? DTAG_TAGS[tag] : DTAG_TAGS['UNKNOWN'];
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
    openAllaccordDtag(){
        this.accordDtag.openAll();
    }
    closeAllaccordDtag(){
        this.accordDtag.closeAll();
    }
    closeAllaccordPos(){
        this.accordPos.closeAll();
    }
    closeAllaccordEntity(){
        this.accordEntity.closeAll();
    }
}
