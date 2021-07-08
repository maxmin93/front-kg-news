import { Component, ViewChild, ElementRef, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';

import { NewsConfig } from 'src/app/app.config';
import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { Document, Sentence, Token } from 'src/app/services/news-models';
import { DocsApiService } from 'src/app/services/docs-api.service';

// **NOTE: You don't need to install vis-data. (standalone)
// https://stackoverflow.com/a/60937676
// https://tillias.wordpress.com/2020/10/11/visualize-graph-data-using-vis-network-and-angular/
import { Node, Edge, Network } from "vis-network/standalone/esm/vis-network"
import { DataSet } from "vis-network/standalone/esm/vis-network"
// npm i vis-data --save-dev

@Component({
  selector: 'app-dtriples',
  templateUrl: './dtriples.component.html',
  styleUrls: ['./dtriples.component.scss']
})
export class DtriplesComponent implements OnInit, OnDestroy {

    document_content:string = 'ABC<mark>EFG</mark>HIJ';
    debug: boolean = false;

    docid: string;
    document: Document;
    sentences: Sentence[] = [];

    zeroPad: Function = (num, places) => String(num).padStart(places, '0');
    rootID: Function = (num) => `${this.docid}_${this.zeroPad(num, 2)}_ROOT`;

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


    // @ViewChild('content', {static: false}) private content: ElementRef;
    @ViewChild('mainVisContainer', {static: false}) private mainVisContainer: ElementRef;
    @ViewChild('subVisContainers', {static: false}) private subVisContainers: ElementRef;

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
            // console.log('sentences:', x);
            this.sentences = x;

            // init sub-graph array
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
                this.triples = x['triples'];
                this.s_roots = x['roots'];
                // use object instead of Map<>
                // console.log(`triples(size=${Object.keys(this.triples).length}):`, Object.keys(this.triples), Object.values(this.triples) );
                // console.log(`s_roots(size=${Object.keys(this.s_roots).length}):`, Object.keys(this.s_roots), Object.values(this.s_roots) );

                // main graph
                this.mainGraph = this.vis_main_graph(this.s_roots, this.triples);

                // detect div of subgraphs
                this.ref.detectChanges();

                // sub graphs
                // **NOTE: dynamic elements need some time for creating DOM
                setTimeout(()=>{
                    let subIndices = Object.keys(this.s_roots);
                    let subDivs = this.subVisContainers.nativeElement.querySelectorAll('#subVisContainer');
                    subDivs.forEach((divContainer, index) => {
                        let s_idx = subIndices[index];         // string
                        let subRoot = this.s_roots[s_idx];
                        let subTriples = this.triples[s_idx];
                        // console.log(`subDiv[${s_idx}]:`, subRoot, subTriples);
                        if( subRoot != null && subTriples.length > 0 ){
                            this.subGraphs[ Number(s_idx) ] = this.vis_sub_graph(s_idx, subTriples, divContainer);
                        }
                    });
                }, 10);
            }
        });
    }


    ////////////////////////////////////////////////////

    vis_main_graph(s_roots: any, triples: any){
        if(!triples || !s_roots) return undefined;

        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // roots of sentences
        for(let i of Object.keys(s_roots)){
            if( !s_roots[i] ) continue;
            nodes_data.add({
                id: this.rootID(Number(i)), label: `<b>ROOT${i}</b>`, group: Number(i),
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
        }

        for(let i of Object.keys(triples)){
            if( triples[i].length == 0 ) continue;
            let t_arr = triples[i] as ITriple[];
            for(let t of t_arr){
                let label_value = //`${t.pred}`;
                    `<b>S:</b> [ ${t.subj.join('|')} ]\n`
                    + `<b>P: ${t.pred}</b>\n`
                    + `<b>O:</b> [ ${t.objs.join('|')} ]\n`
                    + `<b>A:</b> [ ${t.rest.join('|')} ]`;
                nodes_data.add({
                    id: t.id, label: label_value, group: Number(i), shape: "box", margin: 5,
                });
                edges_data.add({
                    from: t.id, to: t.parent, label: t.sg_type
                });
            }
        }

        // create a network
        let container = this.mainVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: { size: 11, face: 'arial', multi: 'html', bold: '12px courier black', align: 'left' }
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

    vis_sub_graph(s_idx: string, triples: any[], divContainer: any){
        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // roots of sentences
        nodes_data.add({
            id: this.rootID(Number(s_idx)), label: `<b>ROOT${s_idx}</b>`, group: Number(s_idx),
            shape: "circle", borderWidth: 2, margin: 5,
            color: { border: 'black', background: 'white' },
            font: { align: 'center' },
        });

        let t_arr = triples as ITriple[];
        for(let t of t_arr){
            let label_value = //`${t.pred}`;
                `<b>S:</b> [ ${t.subj.join('|')} ]\n`
                + `<b>P: ${t.pred}</b>\n`
                + `<b>O:</b> [ ${t.objs.join('|')} ]\n`
                + `<b>A:</b> [ ${t.rest.join('|')} ]`;
            nodes_data.add({ id: t.id, label: label_value, group: Number(s_idx), shape: "box", margin: 5 });
            edges_data.add({ from: t.id, to: t.parent, label: t.sg_type });   // t.head
        }

        // create a network
        let container = divContainer;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: { size: 11, face: 'arial', multi: 'html', bold: '12px courier black', align: 'left' }
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: { to: { type: 'arrow', enabled: true, scaleFactor: 0.5 }, },
            },
            physics: {
                hierarchicalRepulsion: { avoidOverlap: 1, },
            },
            // https://visjs.github.io/vis-network/docs/network/layout.html
            layout: {
                // improvedLayout: true,
                hierarchical: { enabled: true, direction: 'LR', nodeSpacing: 10, /* treeSpacing: 100 */ },
            },
        };

        // initialize your network!
        let network = new Network(container, data, options);

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

