import { Component, ViewChild, ElementRef, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';

import { NewsApiService } from 'src/app/services/news-api.service';
import { UiApiService } from 'src/app/services/ui-api.service';
import { ITriple } from 'src/app/services/graph-models';

import { Document, Sentence, Token } from 'src/app/services/news-models';
import { DocsApiService } from 'src/app/services/docs-api.service';

// **NOTE: You don't need to install vis-data. (standalone)
// https://stackoverflow.com/a/60937676
// https://tillias.wordpress.com/2020/10/11/visualize-graph-data-using-vis-network-and-angular/
import { Node, Edge, Network } from "vis-network/standalone/esm/vis-network"
import { DataSet } from "vis-network/standalone/esm/vis-network"
// npm i vis-data --save-dev

@Component({
  selector: 'app-qtriples',
  templateUrl: './qtriples.component.html',
  styleUrls: ['./qtriples.component.scss']
})
export class QtriplesComponent implements OnInit, OnDestroy {

    debug: boolean = false;
    formQuery = new FormGroup({
        // 공백이 아닌 모든 문자로 시작
        text: new FormControl('', [ Validators.pattern('^[^\s]*') ])
    });

    docid: string;
    document: Document;

    zeroPad: Function = (num, places) => String(num).padStart(places, '0');
    rootID: Function = (_id, num) => `${_id}_${this.zeroPad(num, 2)}_ROOT`;

    // triples data for vis_network
    triples: any;   // Map<string,ITriple[]>;
    s_roots: any;   // Map<string,string>;

    // vis_network objects
    qryGraph: any;
    docsGraph: any;     // query 에 매칭된 모든 documents 들의 그래프

    handler_document:Subscription;
    handler_dtriples:Subscription;
    handler_qtriples:Subscription;


    @ViewChild('docsVisContainer', {static: false}) private docsVisContainer: ElementRef;
    @ViewChild('qryVisContainer', {static: false}) private qryVisContainer: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private ref: ChangeDetectorRef,
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
                this.handler_dtriples = this.getDocTriples(this.docid);

                this.initQuery(this.docid);
            }
        });

        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });
    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
        this.handler_dtriples.unsubscribe();
        this.handler_qtriples.unsubscribe();

        // destory VisNetwork objects
        if( this.docsGraph !== null ){
            this.docsGraph.destroy();
            this.docsGraph = null;
        }
        if( this.qryGraph !== null ){
            this.qryGraph.destroy();
            this.qryGraph = null;
        }
    }

    //////////////////////////////////////////////

    initQuery(docid: string){
        if( docid == 'D71692674') this.formQuery.get('text').setValue(
            '서울중앙지검 증권범죄 합동수사단은 누구에 대해 구속영장을 청구했는가?'
        );
        else if( docid == 'D71692521') this.formQuery.get('text').setValue(
            '새벽 인력시장을 누가 방문했는가? 그리고 언제 방문했는가? 새벽인력시장은 어디에 위치하는가?'
        );
        else if( docid == 'D67108918') this.formQuery.get('text').setValue(
            '일본 주권회복기념식 행사에 누가 참석했는가?'
        );
        else if( docid == 'D67130741') this.formQuery.get('text').setValue(
            '다이렉트늘안심입원비보험은 입원비를 보장해 주는가? 최고 몇세까지 보장하는가?'
        );
        else if( docid == 'D71307886') this.formQuery.get('text').setValue(
            '어제 사고로 누가 숨졌나? 사고는 어떻게 난 것인가?'
        );
        else if( docid == 'D67113585') this.formQuery.get('text').setValue(
            '중, 일 양국 간 영유권 갈등이 전면화 된 계기는 무엇인가?'
        );
        else if( docid == 'D71690104') this.formQuery.get('text').setValue(
            '윤회장은 윤석금 웅진그룹 회장과 같다. 윤 회장은 무슨 혐의로 재판에 넘겨졌는가?'
        );
        // else if( docid == '') this.formQuery.get('text').setValue(
        //     ' '
        // );
    }

    doQuery(){
        let query = this.formQuery.get('text').value;
        console.log('query:', query);
        if(query.length == 0) return;
        // let blank_count = (query.match(/ /g)||[]).length;

        this.docsService.getQryTriples(query).subscribe(x=>{
            console.log('QTriples:', x);
            let triples = x['triples'];
            let s_roots = x['roots'];

            // this.ref.detectChanges();
            // documents graph
            this.qryGraph = this.vis_qry_graph(x['docid'], s_roots, triples);
        });
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

    getDocTriples(docid:string): Subscription{
        return this.docsService.getDocTriples(docid).subscribe(x=>{
            if( !x || Object.keys(x).length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('DocTriples:', x);
            if( x.hasOwnProperty('triples') && x.hasOwnProperty('roots') ){
                this.triples = x['triples'];
                this.s_roots = x['roots'];
                // use object instead of Map<>
                // console.log(`triples(size=${Object.keys(this.triples).length}):`, Object.keys(this.triples), Object.values(this.triples) );
                // console.log(`s_roots(size=${Object.keys(this.s_roots).length}):`, Object.keys(this.s_roots), Object.values(this.s_roots) );

                // detect div of subgraphs
                this.ref.detectChanges();
                // documents graph
                this.docsGraph = this.vis_docs_graph(x['docid'], this.s_roots, this.triples);
            }
        });
    }


    ////////////////////////////////////////////////////

    vis_text_coloring(text: string, tokens: string[][]){
        let done = []
        for(let t of tokens){
            if( done.includes(t[0]) ) continue;
            if( t[1] == null || t[1] == 'OTHER' ) continue;
            text = text.replace(t[0], `<i>${t[0]}</i>`);
            done.push(t[0]);
        }
        return text;
    }

    vis_docs_graph(docid: string, s_roots: any, triples: any){
        if(!triples || !s_roots) return undefined;

        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // roots of sentences
        for(let i of Object.keys(s_roots)){
            if( !s_roots[i] ) continue;
            nodes_data.add({
                id: this.rootID(docid, Number(i)), label: `<b>ROOT${i}</b>`, group: Number(i),
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
        }

        for(let i of Object.keys(triples)){
            if( triples[i].length == 0 ) continue;
            let t_arr = triples[i] as ITriple[];
            for(let t of t_arr){
                let pred_orgin = t.pred.replace(/\s/g, "").replace(/,/g, "");   // 같으면 따로 표시 안함
                let pred_stems = (pred_orgin == t.pred_stems.join('')) ? '' : `(${t.pred_stems.join('|')})`;
                let label_value = //`${t.pred}`;
                    `<b>S:</b> [ ${ this.vis_text_coloring(t.subj.join('|'), t.subj_tokens) } ]\n`
                    + `<b>P: ${ this.vis_text_coloring(t.pred, t.pred_tokens) }</b> ${pred_stems}\n`
                    + `<b>O:</b> [ ${ this.vis_text_coloring(t.objs.join('|'), t.objs_tokens) } ]\n`
                    + `<b>A:</b> [ ${ this.vis_text_coloring(t.rest.join('|'), t.rest_tokens) } ]`;
                nodes_data.add({
                    id: t.id, label: label_value, group: Number(i), shape: "box", margin: 5,
                });
                edges_data.add({
                    from: t.id, to: t.parent, label: t.sg_type
                });
            }
        }

        // create a network
        let container = this.docsVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            autoResize: true,
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: {
                    size: 11, face: 'arial', multi: 'html', align: 'left'
                    , bold: '12px courier black'
                    , ital: '11px arial darkred'
                    , boldital: '12px arial darkred'
                }
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: { to: { type: 'arrow', enabled: true, scaleFactor: 0.5 }, },
            },
            physics: {
                // enabled: true,
                hierarchicalRepulsion: { avoidOverlap: 1, },
            },
            // https://visjs.github.io/vis-network/docs/network/layout.html
            layout: {
                improvedLayout: true,
                hierarchical: { enabled: true, direction: 'UD', nodeSpacing: 10, treeSpacing: 20 },
            },
        };

        // initialize your network!
        let network = new Network(container, data, options);
        window['vis'] = network;

        // event: selectNode 를 설정해도 selectEdge 가 같이 fire 됨 (오류!)
        network.on("select", (params)=>{
            if( params.nodes.length > 0 ){
                // target: nodes
                console.log("Selection Node:", nodes_data.get(params.nodes[0]));
                if( params.nodes.length == 1 ){
                    // if( nodes_data.get(params.nodes[0]).group == 1 ){
                    // }
                }
            }
            // select 가 nodes 에 반응하지 않은 경우만 edges 처리
            else if( params.edges.length > 0 ){
                // console.log("Selected Edges:", params.edges);
            }
        });
        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                console.log("doubleClick:", nodes_data.get(params.nodes[0]));

            }
        });

        return network;
    }

    vis_qry_graph(qid: string, s_roots: any, triples: any){
        if(!triples || !s_roots) return undefined;

        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // roots of sentences
        for(let i of Object.keys(s_roots)){
            if( !s_roots[i] ) continue;
            nodes_data.add({
                id: this.rootID(qid, Number(i)), label: `<b>ROOT${i}</b>`, group: Number(i),
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
        }

        for(let i of Object.keys(triples)){
            if( triples[i].length == 0 ) continue;
            let t_arr = triples[i] as ITriple[];
            for(let t of t_arr){
                let pred_orgin = t.pred.replace(/\s/g, "").replace(/,/g, "");   // 같으면 따로 표시 안함
                let pred_stems = (pred_orgin == t.pred_stems.join('')) ? '' : `(${t.pred_stems.join('|')})`;
                let label_value = //`${t.pred}`;
                    `<b>S:</b> [ ${ this.vis_text_coloring(t.subj.join('|'), t.subj_tokens) } ]\n`
                    + `<b>P: ${ this.vis_text_coloring(t.pred, t.pred_tokens) }</b> ${pred_stems}\n`
                    + `<b>O:</b> [ ${ this.vis_text_coloring(t.objs.join('|'), t.objs_tokens) } ]\n`
                    + `<b>A:</b> [ ${ this.vis_text_coloring(t.rest.join('|'), t.rest_tokens) } ]`;
                nodes_data.add({
                    id: t.id, label: label_value, group: Number(i), shape: "box", margin: 5,
                });
                edges_data.add({
                    from: t.id, to: t.parent, label: t.sg_type
                });
            }
        }

        // create a network
        let container = this.qryVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            autoResize: true,
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: {
                    size: 11, face: 'arial', multi: 'html', align: 'left'
                    , bold: '12px courier black'
                    , ital: '11px arial darkred'
                    , boldital: '12px arial darkred'
                }
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: { to: { type: 'arrow', enabled: true, scaleFactor: 0.5 }, },
            },
            physics: {
                // enabled: true,
                hierarchicalRepulsion: { avoidOverlap: 1, },
            },
            // https://visjs.github.io/vis-network/docs/network/layout.html
            layout: {
                improvedLayout: true,
                hierarchical: { enabled: true, direction: 'UD', nodeSpacing: 10, treeSpacing: 20 },
            },
        };

        // initialize your network!
        let network = new Network(container, data, options);
        window['vis'] = network;

        // event: selectNode 를 설정해도 selectEdge 가 같이 fire 됨 (오류!)
        network.on("select", (params)=>{
            if( params.nodes.length > 0 ){
                // target: nodes
                console.log("Selection Node:", nodes_data.get(params.nodes[0]));
                if( params.nodes.length == 1 ){
                    // if( nodes_data.get(params.nodes[0]).group == 1 ){
                    // }
                }
            }
            // select 가 nodes 에 반응하지 않은 경우만 edges 처리
            else if( params.edges.length > 0 ){
                // console.log("Selected Edges:", params.edges);
            }
        });
        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                console.log("doubleClick:", nodes_data.get(params.nodes[0]));

            }
        });

        return network;
    }

}


/*
{
    "id": "D71331926_00_828fd027",
    "sg_type": "joint",
    "parent": "D71331926_00_ROOT",
    "cpoint": null,
    "head": "ROOT",
    "subj": [
        "한국투자증권 김진우 연구원"
    ],
    "pred": "제시",
    "objs": [
        "투자의견 매수, 목표주가 81,000원"
    ],
    "rest": [
        "31일",
        "대해"
    ]
},
*/
