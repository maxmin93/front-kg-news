import { Component, ViewChild, ElementRef, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, Subscription, fromEvent } from 'rxjs';
import { debounceTime, buffer, map, filter } from 'rxjs/operators';

import { NewsApiService } from 'src/app/services/news-api.service';
import { UiApiService } from 'src/app/services/ui-api.service';
import { ITripleNode, ITripleEdge } from 'src/app/services/graph-models';

import { Document, Sentence, Token } from 'src/app/services/news-models';
import { DocsApiService } from 'src/app/services/docs-api.service';

// **NOTE: You don't need to install vis-data. (standalone)
// https://stackoverflow.com/a/60937676
// https://tillias.wordpress.com/2020/10/11/visualize-graph-data-using-vis-network-and-angular/
import { Node, Edge, Network } from "vis-network/standalone/esm/vis-network"
import { DataSet } from "vis-network/standalone/esm/vis-network"
// npm i vis-data --save-dev

@Component({
  selector: 'app-tgraph',
  templateUrl: './tgraph.component.html',
  styleUrls: ['./tgraph.component.scss']
})
export class TGraphComponent implements OnInit, OnDestroy {


    document_content:string = 'ABC<mark>EFG</mark>HIJ';
    debug: boolean = false;

    docid: string;
    document: Document;
    sentences: Sentence[] = [];

    zeroPad: Function = (num, places) => String(num).padStart(places, '0');
    rootID: Function = (num) => `${this.docid}_${this.zeroPad(num, 2)}`;

    // triples data for vis_network
    t_roots: Map<number,string>;
    t_nodes: ITripleNode[];
    t_edges: ITripleEdge[];
    t_entities: any[];

    spinning: boolean = true;

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
        if( this.mainGraph ){
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
        return this.docsService.getTriplesGraphByDocid(docid).subscribe(x=>{
            this.spinning = false;
            if( !x || Object.keys(x).length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
                return;
            }

            this.t_roots = x['roots'] as Map<number,string>;    // Object 로 인식됨 (Map 안됨)
            this.t_nodes = x['nodes'] as ITripleNode[];
            this.t_edges = x['edges'] as ITripleEdge[];
            this.t_entities = x['options'].hasOwnProperty('entities') ? x['options']['entities'] as any[] : [];

            // use object instead of Map<>
            console.log('roots:', this.t_roots);
            // console.log('nodes:', this.t_nodes);
            // console.log('edges:', this.t_edges);

            // main graph
            this.mainGraph = this.vis_main_graph(this.t_roots, this.t_nodes, this.t_edges);

            // detect div of subgraphs
            this.ref.detectChanges();

            // sub graphs
            // **NOTE: dynamic elements need some time for creating DOM
            setTimeout(()=>{
                let subDivs = this.subVisContainers.nativeElement.querySelectorAll('#subVisContainer');
                let root_keys = Object.keys(this.t_roots);
                let r_indices = Object.keys(this.t_roots).map(x=> Number(x.split('_')[1]) );
                // console.log('root_keys', root_keys, r_indices);
                subDivs.forEach((divContainer, index) => {
                    if( r_indices.indexOf(index) < 0 ){             // if not exists, skip
                        this.subGraphs[ index ] = undefined;
                    }
                    else{                                       // if exists, draw graph
                        let root_key = root_keys[ r_indices.indexOf(index) ];
                        let root_id = this.t_roots[root_key];
                        // console.log(`subGraphs[${index}]`, root_key, root_id);
                        let nodes = this.t_nodes.filter((e)=>e.group == root_key);
                        let edges = this.t_edges.filter((e)=>e.group == root_key);
                        let entities = this.t_entities.filter((e)=>e.group == root_key);
                        this.subGraphs[ index ] = this.vis_sub_graph(root_key, root_id, nodes, edges, entities, divContainer);
                    }
                });
            }, 10);

        });
    }


    ////////////////////////////////////////////////////

    vis_text_coloring(tokens: any[]){
        let result = []
        for(let t of tokens){
            let text = t[0];
            let entities = [... new Set(t[1]) ];   // list of unique values
            let ordered_entities = entities.sort((a:string, b:string)=>{
                return b.length - a.length;
            });                                     // sort by length (desc)
            for(let e of ordered_entities){
                let e_re = new RegExp(`(^|[^>])(${e})([^<]|$)`, "g");
                text = text.replace(e_re, "$1<i>$2</i>$3");
            }
            // console.log('text_rep:', t[0], '==>', ordered_entities, '==>', text);
            result.push(text);
        }
        return result;
    }

    vis_main_graph(roots: any, nodes: any[], edges: any[]){
        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // root
        for(const [key, value] of Object.entries(roots)){
            // const s_idx = Number(key);
            const root_key = key;    // this.rootID(s_idx);
            nodes_data.add({
                id: root_key, label: `<b>ROOT${root_key.split('_')[1]}</b>`, group: root_key,
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
            edges_data.add({
                from: value, to: root_key, group: root_key, label: ''
            });
        }

        // nodes
        for(let data of nodes){
            const t = data as ITripleNode;
            // VERB 의 기본형
            let stems = (t.pred[1].length == 0 || t.pred[0].replace(' ','') == t.pred[1].join(''))
                        ? "" : `(${ t.pred[1].join('|') })`;
            // Triple 라벨
            let label_value =
                `<b>S:</b> [ ${ this.vis_text_coloring(t.subj).join('|') } ]\n`
                + `<b>P:</b> <b><i>${t.pred[0]}</i></b>${stems}\n`
                + `<b>O:</b> [ ${ this.vis_text_coloring(t.objs).join('|') } ]\n`
                + `<b>C:</b> [ ${ this.vis_text_coloring(t.rest).join('|') } ]`;
            nodes_data.add({
                id: t.id, label: label_value, group: t.group, shape: "box", margin: 5,
            });
        }
        // edges
        for(let data of edges){
            const e = data as ITripleEdge;
            let label_value = `${e.joint[0]}`;
            edges_data.add({
                from: e.from, to: e.to, group: e.group, label: label_value
            });
        }

        // create a network
        let container = this.mainVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: {
                    size: 11, face: 'arial', multi: 'html', align: 'left'
                    , bold: '12px courier black'
                    , ital: '11px arial darkred'
                    , boldital: '12px arial darkblue'
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
        // network.on("click", (params)=>{
        //     if( params.nodes.length > 0 ){
        //         console.log("Selection Node:", nodes_data.get(params.nodes[0]));
        //     }
        //     // select 가 nodes 에 반응하지 않은 경우만 edges 처리
        //     else if( params.edges.length > 0 ){
        //     }
        // });

        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                console.log("doubleClick:", nodes_data.get(params.nodes[0]));
            }
        });

        return network;
    }

    vis_sub_graph(root_key: string, root_id: string, nodes: any[], edges: any[], entities: any[], divContainer: any){
        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // root
        // const root_id = this.rootID(s_idx);
        nodes_data.add({
            id: root_key, label: `<b>ROOT${root_key.split('_')[1]}</b>`, group: root_key,
            shape: "circle", borderWidth: 2, margin: 5,
            color: { border: 'black', background: 'white' },
            font: { align: 'center' },
        });
        edges_data.add({
            from: root_id, to: root_key, group: root_key, label: '',
            dashes: true, font: { align: "horizontal" }
        });

        // nodes
        for(let data of nodes){
            const t = data as ITripleNode;
            // VERB 의 기본형
            let stems = (t.pred[1].length == 0 || t.pred[0].replace(' ','') == t.pred[1].join(''))
                        ? "" : `(${ t.pred[1].join('|') })`;
            // Triple 라벨
            let label_value =
                `<b>S:</b> [ ${ this.vis_text_coloring(t.subj).join('|') } ]\n`
                + `<b>P:</b> <b><i>${t.pred[0]}</i></b>${stems}\n`
                + `<b>O:</b> [ ${ this.vis_text_coloring(t.objs).join('|') } ]\n`
                + `<b>C:</b> [ ${ this.vis_text_coloring(t.rest).join('|') } ]`;
            nodes_data.add({
                id: t.id, label: label_value, group: t.group, shape: "box", margin: 5,
            });
        }

        // edges
        for(let data of edges){
            const e = data as ITripleEdge;
            let label_value = `${e.joint[0]}(${e.joint[1]})`;
            edges_data.add({
                from: e.from, to: e.to, group: e.group, label: label_value
            });
        }

        // entities
        for(let e of entities){
            let edge_label = `${e['token']}(${e['k_tag']})`;
            edges_data.add({
                from: e.from, to: e.to, group: e.group, label: edge_label,
                dashes: true, font: { align: "horizontal" }
            });
            if( !nodes_data.get(e.from) ){
                let node_label = `${e['token']}\n[${e['e_tag']}]`;
                nodes_data.add({
                    id: e.from, group: e.group, label: node_label,
                    shape: "circle", font: { align: 'center' },
                    color: { border: 'orange', background: 'white' },
                });
            }
        }

        // create a network
        let container = divContainer;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: {
                    size: 11, face: 'arial', multi: 'html', align: 'left'
                    , bold: '12px courier black'
                    , ital: '11px arial darkred'
                    , boldital: '12px arial darkblue'
                }
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

        // network.on("click", (params)=>{
        //     if( params.nodes.length > 0 ){
        //         const target = params.nodes[0];
        //         console.log("click Node:", nodes_data.get(target));
        //     }
        //     // select 가 nodes 에 반응하지 않은 경우만 edges 처리
        //     // ==> selectNode 를 설정해도 selectEdge 가 같이 fire 됨 (오류!)
        //     else if( params.edges.length > 0 ){
        //         const target = params.edges[0];
        //         console.log("click Edge:", edges_data.get(target));
        //     }
        // });
        // network.on("oncontext", (params)=>{
        //     var nodeId = network.getNodeAt(params.pointer.DOM);
        //     console.log("onContext Node:", nodeId);
        // });

        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                let target = params.nodes[0]
                console.log("edit Node:", target, nodes_data.get(target));
            }
            else{
                console.log("add new Node!");
            }
        });

        return network;
    }

}


/*
{
    "roots": {
        "0": "D71332522_00_T000",
        "1": "D71332522_01_T003",
        "2": "D71332522_02_T004",
        "3": "D71332522_03_T005",
        "4": "D71332522_04_T008",
        "5": "D71332522_05_T009"
    },
    "nodes": [
        {
        "id": "D71332522_00_T000",
        "group": 0,
        "subj": [ ["대우증권",["대우증권"]] ],
        "pred": "밝혔다",
        "objs": [ ],
        "rest": [ ["31일",["31일"]], ["투자의견",[]] ]
        },
        {
        "id": "D71332522_00_T001",
        "group": 0,
        "subj": [ ],
        "pred": "대해",
        "objs": [ ],
        "rest": [ ["SK텔레콤",["SK텔레콤"]] ]
        },
        {
        "id": "D71332522_00_T002",
        "group": 0,
        "subj": [ ["매수, 목표주가",[]] ],
        "pred": "유지",
        "objs": [ ["28만원",["28만원"]] ],
        "rest": [ ]
        },
    ],
    "edges": [
        {
        "from": "D71332522_00_T002",
        "to": "D71332522_00_T000",
        "label": "밝혔다"
        },
        {
        "from": "D71332522_00_T001",
        "to": "D71332522_00_T000",
        "label": "밝혔다"
        },
    ]
}
*/
