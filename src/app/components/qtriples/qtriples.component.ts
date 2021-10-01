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
    @ViewChild('resultVisContainer', {static: false}) private resultVisContainer: ElementRef;

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

    // query triples graph
    doQuery(){
        let query = this.formQuery.get('text').value;
        console.log('query:', query);
        if(query.length == 0) return;
        // let blank_count = (query.match(/ /g)||[]).length;

        this.docsService.getQryTriples(query).subscribe(x=>{
            console.log('QTriples:', x);

            let q_roots = x['roots'] as Map<number,string>;    // Object 로 인식됨 (Map 안됨)
            let q_nodes = x['nodes'] as ITripleNode[];
            let q_edges = x['edges'] as ITripleEdge[];
            console.log('Q.roots:', q_roots);
            console.log('Q.nodes:', q_nodes);
            console.log('Q.edges:', q_edges);

            // documents graph
            this.qryGraph = this.draw_vis_graph(this.qryVisContainer, x['docid'], q_roots, q_nodes, q_edges);
        });
    }

    // result triples graph
    doSearch(){
        let query = this.formQuery.get('text').value;
        if(query.length == 0) return;

        this.docsService.getResultTriples(query, this.docid).subscribe(x=>{
            console.log('AnsTriples:', x);

            let a_roots = x['roots'] as Map<number,string>;    // Object 로 인식됨 (Map 안됨)
            let a_nodes = x['nodes'] as ITripleNode[];
            let a_edges = x['edges'] as ITripleEdge[];
            console.log('A.roots:', a_roots);
            console.log('A.nodes:', a_nodes);
            console.log('A.edges:', a_edges);

            // this.ref.detectChanges();
            // documents graph
            this.qryGraph = this.draw_vis_graph(this.resultVisContainer, x['docid'], a_roots, a_nodes, a_edges);
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
        return this.docsService.getTripleGraphs(docid).subscribe(x=>{
            if( !x || Object.keys(x).length == 0 ){
                console.log(`Empty response by docid=[${docid}]`);
            }
            let d_roots = x['roots'] as Map<number,string>;    // Object 로 인식됨 (Map 안됨)
            let d_nodes = x['nodes'] as ITripleNode[];
            let d_edges = x['edges'] as ITripleEdge[];
            // use object instead of Map<>
            console.log('D.roots:', d_roots);
            console.log('D.nodes:', d_nodes);
            console.log('D.edges:', d_edges);

            // detect div of subgraphs
            this.ref.detectChanges();
            // documents graph
            this.docsGraph = this.draw_vis_graph(this.docsVisContainer, x['docid'], d_roots, d_nodes, d_edges);
        });
    }


    ////////////////////////////////////////////////////

    vis_text_coloring(tokens: any[]){
        let result = []
        for(let t of tokens){
            let text = t[0];
            for(let e of t[1]){
                text = text.replace(e, `<i>${e}</i>`);
            }
            result.push(text);
        }
        return result;
    }

    draw_vis_graph(container: ElementRef, docid: string, roots: Map<number,string>, nodes: ITripleNode[], edges: ITripleEdge[]){
        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // root
        for(const [key, value] of Object.entries(roots)){
            const s_idx = Number(key);
            const root_id = this.rootID(s_idx);
            nodes_data.add({
                id: root_id, label: `<b>ROOT${s_idx}</b>`, group: s_idx,
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
            edges_data.add({
                from: value, to: root_id, group: s_idx, label: ''
            });
        }
        // nodes
        for(let data of nodes){
            const t = data as ITripleNode;
            let label_value = //`${t.pred}`;
                `<b>S:</b> [ ${ this.vis_text_coloring(t.subj).join('|') } ]\n`
                + `<b>P:</b> <b><i>${t.pred}</i></b>\n`
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
