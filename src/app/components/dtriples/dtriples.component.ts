import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';

import { NewsConfig } from 'src/app/app.config';
import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { Document, Sentence, Token } from 'src/app/services/news-models';
import { DocsApiService } from 'src/app/services/docs-api.service';

declare const vis:any;


@Component({
  selector: 'app-dtriples',
  templateUrl: './dtriples.component.html',
  styleUrls: ['./dtriples.component.scss']
})
export class DtriplesComponent implements OnInit {

    document_content:string = 'ABC<mark>EFG</mark>HIJ';
    debug: boolean = false;

    docid: string;
    document: Document;
    sentences: Sentence[] = [];

    // triples data for vis_network
    triples: any;   // Map<string,ITriple[]>;
    s_roots: any;   // Map<string,string>;

    // vis_network objects
    mainGraph: any;
    subGraphs: any[];
    sizeOfSubGraphs: number = 0;

    handler_document:Subscription;
    handler_sentences:Subscription;
    handler_dtriples:Subscription;


    @ViewChild('content', {static: false}) private content: ElementRef;
    @ViewChild('mainVisContainer', {static: false}) private mainVisContainer: ElementRef;
    @ViewChild('subVisContainers', {static: false}) private subVisContainers: ElementRef;

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
                this.handler_dtriples = this.getDocTriples(this.docid);
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });
    }

    ngOnDestroy(): void{
        this.handler_document.unsubscribe();
        this.handler_sentences.unsubscribe();
        this.handler_dtriples.unsubscribe();

        // destory VisNetwork objects
        if( this.mainGraph !== null ){
            this.mainGraph.destroy();
            this.mainGraph = null;
        }
        if( this.sizeOfSubGraphs > 0 )
            this.vis_destroy_subgraphs();
    }

    vis_destroy_subgraphs(){
        for(let s_idx=0; s_idx<this.sizeOfSubGraphs; s_idx+=1){
            if( this.subGraphs[s_idx] ){
                this.subGraphs[s_idx].destroy();
                this.subGraphs[s_idx] = undefined;
                this.sizeOfSubGraphs = 0;
            }
        }
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

            this.sizeOfSubGraphs = this.sentences.length;
            this.subGraphs = new Array(this.sizeOfSubGraphs);
        });
    }

    getDocTriples(docid:string): Subscription{
        return this.docsService.getDocTriples(docid).subscribe(x=>{
            if( !x || Object.keys(x).length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            console.log('DocTriples:', x);
            if( x.hasOwnProperty('triples') && x.hasOwnProperty('roots') ){
                // this.triples = new Map(Object.entries(x['triples'])) as Map<string,ITriple[]>;
                // this.s_roots = new Map(Object.entries(x['roots'])) as Map<string,string>;
                this.triples = x['triples'];
                this.s_roots = x['roots'];
                console.log('triples:', Object.keys(this.triples), Object.values(this.triples) );
                console.log('s_roots:', Object.keys(this.s_roots), Object.values(this.s_roots) );
                this.mainGraph = this.vis_graph(this.triples, this.s_roots);
            }
        });
    }


    ////////////////////////////////////////////////////

    vis_graph(triples: any, s_roots: any){
        if(!triples || !s_roots) return;
        const zeroPad = (num, places) => String(num).padStart(places, '0');
        const rootID = (num) => `${this.docid}_${zeroPad(num, 2)}_ROOT`;

        // roots of sentences
        let root_nodes = [];
        for(let i of Object.keys(s_roots)){
            if( !s_roots[i] ) continue;
            root_nodes.push({
                id: rootID(Number(i)), label: `ROOT${i}`, group: Number(i),
                shape: "circle", margin: 10,
                borderWidth: 2,
                color: { border: 'black', background: 'white' },
                font: { bold: { mod: 'bold', size: 14 } }   // 안되네!
            });
        }

        let triple_nodes = [];
        let triple_edges = [];
        for(let i of Object.keys(triples)){
            if( triples[i].length == 0 ) continue;
            let t_arr = triples[i] as ITriple[];
            for(let t of t_arr){
                let label_value = //`${t.pred}`;
                    `S: [${t.subj.join('|')}]\n`
                    + `P: ${t.pred}\n`
                    + `O: [${t.objs.join('|')}]\n`
                    + `A: [${t.rest.join('|')}]`;
                triple_nodes.push({ id: t.id, label: label_value, group: Number(i), shape: "box", margin: 10, font: { align: 'left' } });
                triple_edges.push({ from: t.id, to: t.parent, label: t.sg_type });
            }
        }

        // id: number or string
        let nodes_data = new vis.DataSet(root_nodes.concat(triple_nodes), {});
        let edges_data = new vis.DataSet(triple_edges, {});
        // console.log(nodes_data.get(0));

        // create a network
        let container = this.mainVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };
        // styles
        let options = {
            nodes: {
                font: { size: 11, face: 'arial', },
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: { to: { type: 'arrow', scaleFactor:0.5 }, },
            },
            physics: {
                enabled: true      // true
            },
            // https://visjs.github.io/vis-network/docs/network/layout.html
            layout: {
                // improvedLayout: true,
                hierarchical: { enabled: true, nodeSpacing: 50, treeSpacing: 100 },
            },
        };

        // initialize your network!
        let network = new vis.Network(container, data, options);
        window['vis'] = network;

        // event: selectNode 를 설정해도 selectEdge 가 같이 fire 됨 (오류!)
        network.on("select", (params)=>{
            if( params.nodes.length > 0 ){
                // target: nodes
                // console.log("Selection Node:", nodes_data.get(params.nodes[0]));
                if( params.nodes.length == 1 ){
                    if( nodes_data.get(params.nodes[0]).group == 1 ){

                    }
                }
            }
            // select 가 nodes 에 반응하지 않은 경우만 edges 처리
            else if( params.edges.length > 0 ){
                console.log("Selected Edges:", params.edges);
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
export interface ITriple {
    id: string;
    sg_type: string;
    parent: string;
    cpoint?: string;
    head: string
    subj: string[];
    pred: string;
    objs: string[];
    rest: string[];
}

