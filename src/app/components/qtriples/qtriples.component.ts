import { Component, ViewChild, ElementRef, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';

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
    rootID: Function = (_id, num) => `${_id}_${this.zeroPad(num, 2)}`;

    // vis_network objects
    qryGraph: any;
    ansGraph: any;     // query 에 매칭된 모든 documents 들의 그래프
    ansResults: string = "TEST";

    handler_atriples:Subscription;
    handler_qtriples:Subscription;


    @ViewChild('qryVisContainer', {static: false}) private qryVisContainer: ElementRef;
    @ViewChild('ansVisContainer', {static: false}) private ansVisContainer: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private ref: ChangeDetectorRef,
        private uiService: UiApiService,
        private newsService: NewsApiService,
        private docsService: DocsApiService
    ) { }

    ngOnInit(): void {
        // parameters of routes
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];

            // for TEST
            this.initQuery();
        });
    }

    ngOnDestroy(): void{
        this.handler_atriples.unsubscribe();
        this.handler_qtriples.unsubscribe();

        // destory VisNetwork objects
        if( this.ansGraph ){
            this.ansGraph.destroy();
            this.ansGraph = null;
        }
        if( this.qryGraph ){
            this.qryGraph.destroy();
            this.qryGraph = null;
        }
    }

    //////////////////////////////////////////////

    initQuery(){
        let queries = [
            '가정은 자녀의 양육비로 얼마를 지출하는가?',

            '일본 주권회복기념식 행사에 누가 참석했는가?',

            '서울중앙지검 증권범죄 합동수사단은 누구에 대해 구속영장을 청구했는가?',
            '윤석금 웅진그룹회장은 윤회장이다. 새벽 인력시장을 누가 방문했는가? 그리고 언제 방문했는가? 새벽인력시장은 어디에 위치하는가?',
            '다이렉트늘안심입원비보험은 입원비를 보장해 주는가? 최고 몇세까지 보장하는가?',
            '어제 사고로 누가 숨졌나? 사고는 어떻게 난 것인가?',
            '중, 일 양국 간 영유권 갈등이 전면화 된 계기는 무엇인가?',
            '윤석금 웅진그룹 회장은 윤회장이다. 윤회장은 무슨 혐의로 재판에 넘겨졌는가?',
        ];

        let idx = 0;
        this.formQuery.get('text').setValue( queries[idx] );
    }

    // query triples graph
    doQuery(){
        let query = this.formQuery.get('text').value;
        console.log('query:', query);
        if(query.length == 0) return;
        // let blank_count = (query.match(/ /g)||[]).length;

        this.docsService.getQryTriples(query).subscribe(x=>{
            if( x['status'] != 'SUCCESS' ){
                this.ansResults = `status='${x['status']}', where='${x['where']}'\n`;
                return;
            }

            let q_graph = x['graph'] as Map<string,any>;
            let q_query = x['query'] as Map<string,any>;
            console.log('Q.query:', q_query);

            // documents graph
            this.qryGraph = this.draw_qry_graph(this.qryVisContainer, q_graph, q_query);
        });
    }

    // result triples graph
    doSearch(){
        let query = this.formQuery.get('text').value;
        if(query.length == 0) return;

        this.ansResults = "";
        this.docsService.getResultTriples(query).subscribe(x=>{
            if( x['status'] != 'SUCCESS' ){
                this.ansResults = `status='${x['status']}', where='${x['where']}'\n`;
                return;
            }

            let graph = x['graph'] as Map<string,any>;    // roots, nodes, edges, options
            let query = x['query'] as Map<string,any>;
            let results = x['results'] as Map<string,any>;
            console.log('results:', results);
            console.log('g_options:', graph['options']);

            this.ansResults = `QUERY: q_tag='${query['question']['q_tag']}', clues=[${query['question']['clues']}], e_tags=[${query['question']['e_tags']}]\n`;
            this.ansResults += "--------------------------------------------------------------------------------------------------------\n";
            for( const [sg_id, value] of Object.entries(results) ){
                this.ansResults += `RNK[${value[0]}]\t: score=${value[1]}, sum_sim=${value[2]}, cnt_sim=${value[3]}, density=${value[4]}\n`;
                this.ansResults += `\t\t==> type='${graph['options']['matched'][sg_id][1]}', answer='${graph['options']['matched'][sg_id][2]}'\n`;
            }

            // this.ref.detectChanges();
            // documents graph
            this.qryGraph = this.draw_ans_graph(this.ansVisContainer, graph, results);
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
            // match question clues
            text = text.replace(/(\$\w+\$)/g,"<i>$1</i>");
            result.push(text);
        }
        return result;
    }

    // VIS-NETWORK: Query Graph
    draw_qry_graph(container: ElementRef, graph: Map<string,any>, query: Map<string,any>){
        let roots = graph['roots'] as any;
        let nodes = graph['nodes'] as ITripleNode[];
        let edges = graph['edges'] as ITripleEdge[];

        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // root
        for(const [q_id, t_id] of Object.entries(roots)){
            nodes_data.add({
                id: q_id, label: `<b>QUERY</b>`, group: q_id,
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'horizontal' },
            });
            edges_data.add({
                from: t_id, to: q_id, label: query['question']['q_word'], group: q_id,
                font: { align: 'horizontal' },
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
                id: t.id, label: label_value, group: t.group, shape: "box", margin: 5
                , borderWidth: query['question']['t_id'] == t.id ? 3 : 1
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
                    , boldital: '12px arial darkblue'
                }
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "horizontal" },
                arrows: { to: { type: 'arrow', enabled: true, scaleFactor: 0.5 }, },
            },
            physics: {
                // enabled: true,
                hierarchicalRepulsion: { avoidOverlap: 1, },
            },
            // https://visjs.github.io/vis-network/docs/network/layout.html
            layout: {
                improvedLayout: true,
                hierarchical: { enabled: true, direction: 'LR', nodeSpacing: 10, treeSpacing: 20 },
            },
        };

        // initialize your network!
        let network = new Network(container.nativeElement, data, options);

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

    // VIS-NETWORK: Answer Graph
    draw_ans_graph(container: ElementRef, graph: Map<string,any>, results: Map<string,any>){
        let roots = graph['roots'] as any;
        let nodes = graph['nodes'] as ITripleNode[];
        let edges = graph['edges'] as ITripleEdge[];
        let g_options = graph['options'] as Map<string,any>;
        let entities = g_options.hasOwnProperty('entities') ? g_options['entities'] as any[] : [];

        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // root
        for(const [sg_id, t_id] of Object.entries(roots)){
            nodes_data.add({        // rank
                id: sg_id, label: `<b>RNK_${results[sg_id][0]}</b>`, group: sg_id,
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
            edges_data.add({        // score
                from: t_id, to: sg_id, label: `${results[sg_id][1]}`, group: sg_id,
                dashes: true, font: { align: "horizontal" }
            });
        }

        // 2-depth Object: { q_id: {sg_id: [ (t_id, t_val), .. ], .. }, .. }
        let matched = g_options.hasOwnProperty('matched') ? g_options['matched'] : {} as any;
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
                id: t.id, label: label_value, group: t.group, shape: "box", margin: 5
                , borderWidth: t.id == matched[t.group][0] ? 3 : 1
            });
        }

        // edges
        for(let data of edges){
            const e = data as ITripleEdge;
            let label_value = `${e.joint[0]}`;
            edges_data.add({
                from: e.from, to: e.to, group: e.group, label: label_value
                , width: 1, dashes: false
            });
        }

        // entities
        for(let e of entities){
            let edge_label = `${e['token']}(${e['k_tag']})`;
            edges_data.add({
                from: e.from, to: e.to, group: e.group, label: edge_label,
                dashes: true, font: { align: "horizontal" }
            });
            let node_label = `${e['token']}\n[${e['e_tag']}]`;
            nodes_data.add({
                id: e.from, group: e.group, label: node_label,
                shape: "circle", font: { align: 'center' },
                color: { border: 'orange', background: 'white' },
            });
        }

        // create a network
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
                    , boldital: '12px arial darkblue'
                }
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "horizontal" },
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
        let network = new Network(container.nativeElement, data, options);
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
