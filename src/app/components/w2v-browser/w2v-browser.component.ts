import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { WordsApiService } from 'src/app/services/words-api.service';
import { UiApiService } from '../../services/ui-api.service';
import { ColorProviderService } from '../../services/color-provider.service';

declare const vis:any;

import { ILabel, IElement, IGraph } from '../../services/graph-models';

import { MatDialog } from '@angular/material/dialog';
import { W2vDialogComponent } from '../w2v-browser/w2v-dialog/w2v-dialog.component';


@Component({
  selector: 'app-w2v-browser',
  templateUrl: './w2v-browser.component.html',
  styleUrls: ['./w2v-browser.component.scss']
})
export class W2vBrowserComponent implements OnInit, OnDestroy, AfterViewInit {

    positives: string[] = ['박근혜'];
    negatives: string[] = [];
    topN: number = 50;
    threshold: number = 0.60;
    sizeOfSubGraphs: number = 5;

    mainGraph: any;
    subGraphs: any[] = new Array(this.sizeOfSubGraphs);
    segments: Map<string,any>;

    @ViewChild('mainVisContainer', {static: false}) private mainVisContainer: ElementRef;
    @ViewChild('subVisContainers', {static: false}) private subVisContainers: ElementRef;

    pivot: string;
    pivots: any;            // N2vDialog { label: [[noun, tf, df, tfidf], ..], }

    debug: boolean = false;
    handler_pivots:Subscription;
    handler_graph:Subscription;

    @ViewChild('tippy_test', {static: false}) private tippy_test: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private wordsService: WordsApiService,
        public pivotsDialog: MatDialog
    ) { }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });
        // parameters of routes
        this.route.paramMap.subscribe(params => {
            if( params.has('pivot') ){
                this.pivot = params.get('pivot');
                console.log('pivot:', this.pivot);
                if( this.pivot ){
                    this.positives = [ this.pivot ];
                    this.negatives = [];
                    this.load_words_graph();
                }
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });

        // get data
        this.handler_pivots = this.getN2vPivots();
    }

    ngAfterViewInit(): void{
        // this.load_words_graph();
    }

    ngOnDestroy(): void{
        if(this.handler_pivots) this.handler_pivots.unsubscribe();
        if(this.handler_graph) this.handler_graph.unsubscribe();

        // destory VisNetwork objects
        if( this.mainGraph !== null ){
            this.mainGraph.destroy();
            this.mainGraph = null;
        }
        this.vis_destroy_subgraphs();
    }

    vis_destroy_subgraphs(){
        for(let sg_idx=0; sg_idx<this.sizeOfSubGraphs; sg_idx+=1){
            if( this.subGraphs[sg_idx] ){
                this.subGraphs[sg_idx].destroy();
                this.subGraphs[sg_idx] = undefined;
            }
        }
    }

    load_words_graph(){
        // destory VisNetwork objects
        if( this.mainGraph !== undefined ){
            this.mainGraph.destroy();
            this.mainGraph = undefined;
            this.vis_destroy_subgraphs();
        }

        this.handler_graph = this.getW2vWordsGraph(this.positives, this.negatives, this.topN, this.threshold);
    }


    //////////////////////////////////////////////
    //  APIs
    //

    // Dialog 에서 사용
    // return: { entity: [[noun, tf, df, tfidf], ..], }
    getN2vPivots(): Subscription{
        return this.wordsService.getStatTfidfOfEntities().subscribe(x=>{
            this.pivots = x;
        });
    }

    // return: { pivot, nodes[], edges_syn[], edges_fof[] }
    getW2vWordsGraph(positives: string[], negatives: string[]=[], topN: number=20, threshold: number=0.65): Subscription{
        return this.wordsService.getW2vWordsGraph(positives, negatives, topN, threshold).subscribe(x=>{
            console.log('graph data:', x);
            this.mainGraph = this.vis_graph(x);

            // this.positives = x['positives'];
            // this.negatives = x['negatives'];
            // this.graph = this.makeGraph(x);
        });
    }


    //////////////////////////////////////////////
    //  TFIDF Dialog
    //


    openDialog() {
        const dialogRef = this.pivotsDialog.open(W2vDialogComponent, {
            width : '800px',
            height: '740px',
            data: this.pivots
        });

        dialogRef.afterClosed().subscribe(result => {
            if( result ){
                // this.searchStr = result.noun;
                // this.searchSubmit(this.searchStr);
            }
        });
    }


    ////////////////////////////////////////////////////
    //  Vis-Network
    //

    vis_graph(x: any){
        if(!x) return;

        let pivot = `${this.positives.join("+")}`;
        if( this.negatives.length > 0 ) pivot += `\n-(${this.negatives.join(",")})`;

        // id: number or string
        let nodes_data = new vis.DataSet([{ id: 0, label: pivot, group: 0, shape: "box" }], {});
        let edges_data = new vis.DataSet([], {});
        // console.log(nodes_data.get(0));

        this.segments = new Map(Object.entries(x['segments']));
        let order = 1;

        // neighbors
        for(let nbr of x['neighbors']){
            nodes_data.add({ id: order, label: nbr[0], group: 1 });     // label 있으면 size 조정 안됨
            let sg_size = this.segments.get(nbr[0]).length;
            edges_data.add({
                from: 0, to: order, arrows: {to: {enabled: true}},
                width: 1+2*Math.log10(sg_size+1),       // sg 개수만큼 line 굵게 그리기
                dashes: (sg_size>0) ? false : true,     // sg 가 하나도 없으면 dash-line
                label: `${nbr[1].toFixed(4)}`, font: { align: "middle" }
            });
            // console.log(`** edge[${order}]:`, nbr[0], sg_size, '==>', 1+2*Math.log10(sg_size+1));
            order += 1;
        }

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
            layout: {
                randomSeed: 0,
            }
        };

        // initialize your network!
        let network = new vis.Network(container, data, options);

        // add event listeners
        network.on("select", (params)=>{
            // target: nodes
            if(params.nodes.length > 0){
                console.log("Selection Node:", nodes_data.get(params.nodes[0]));
                if( params.nodes.length == 1 ){
                    if( nodes_data.get(params.nodes[0]).group == 1 ){
                        let sg_pivots: string[] = [...x['positives']];
                        sg_pivots.push(nodes_data.get(params.nodes[0]).label);
                        let sg_list = this.segments.get( nodes_data.get(params.nodes[0]).label );
                        console.log(`${sg_pivots}: sg_list=${sg_list.length}`);
                        // subgraphs 그리기
                        this.vis_subgraphs(sg_pivots, sg_list);
                    }
                }
            }
            // target: edges
            else if(params.edges.length == 1){
                console.log("Selection Edge:", params.edges[0], edges_data.get(params.edges[0]));
            }
        });
        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                console.log("doubleClick:", nodes_data.get(params.nodes[0]));
                this.pivot = nodes_data.get(params.nodes[0]).label;
                this.positives = [ this.pivot ];
                this.negatives = [];
                this.load_words_graph();
            }
        });

        return network;
    }

    vis_subgraphs(sg_pivots: string[], sg_list:any[]){
        // clear
        this.vis_destroy_subgraphs();

        let sg_idx = 0;
        for(let sg of sg_list){
            let nodes = new vis.DataSet();
            let edges = new vis.DataSet();

            for( let i=0; i<sg['sg_nodes'].length; i+=1 ){
                let token = sg['sg_nodes'][i];
                nodes.add({
                    id: i,
                    label: token + (sg['sg_entities'][i] ? `\n<${sg['sg_entities'][i].toLowerCase()}>` : ''),
                    color: { background: (sg_pivots.includes(token) ? '#D2E5FF' : 'orange') }
                });
                if(sg['sg_type'] == 'chain'){
                    if(i > 0){
                        edges.add({ from: i-1, to: i });
                    }
                }
                else{
                    if(i < sg['sg_nodes'].length-1){
                        edges.add({ from: i, to: sg['sg_nodes'].length-1 });
                    }
                }
            }
            let root = sg['sg_nodes'].length - 1;
            nodes.get(root)['borderWidth'] = 2;     // root 노드 강조!

            // create a network
            let container = this.subVisContainers.nativeElement.children[sg_idx];
            let options = {
                edges: {
                    arrows: { to: {enabled: true, type: 'arrow', scaleFactor: 0.5} },
                },
                layout: {
                    randomSeed: root,
                }
            };
            this.subGraphs[sg_idx] = new vis.Network(container, {nodes: nodes, edges: edges}, options);
            // this.subGraphs[sg_idx].redraw();

            // next
            sg_idx += 1;
            if( sg_idx > this.sizeOfSubGraphs ) break;
        }
    }

}

/*
    vis_subgraphs(sg_pivots: string[], sg_list:any[]){
        // clear
        this.vis_destroy_subgraphs();

        // sg_list 안에 variant 들이 있고, 그것까지 모두 그린다
        let sg_idx = 0;
        for(let sg of sg_list){
            for(let i=0; i<sg['sg_nodes'].length; i+=1){
                let t_nodes = sg['sg_nodes'][i];
                let t_edges = sg['sg_edges'][i];
                let t_labels = sg['entities'][i];
                let t_counter: Map<string,number> = new Map();

                // nodes data
                let nodes = new vis.DataSet();
                let e_idx = 0;
                for(let t of t_nodes){
                    if( !t_counter.has(t) ){
                        t_counter.set(t, 0);
                        nodes.add({
                            id: t,
                            label: t + (t_labels[e_idx] ? `\n<${t_labels[e_idx].toLowerCase()}>` : ''),
                            color: { background: (sg_pivots.includes(t) ? '#D2E5FF' : 'orange') }
                        });
                    }
                    e_idx += 1;
                }

                // edges data
                let edges = new vis.DataSet();
                for(let t of t_edges){
                    let t_splited = t.split(',')
                    if( t_splited.length == 2 ){
                        // t_counter.set(t_splited[0],  t_counter.get(t_splited[0])+1);
                        t_counter.set(t_splited[1],  t_counter.get(t_splited[1])+1);
                        edges.add({ from: t_splited[0], to: t_splited[1] });
                    }
                }
                let max_count = Math.max(...t_counter.values());
                let root = [...t_counter.keys()][t_counter.size-1];     // sg_type='single'
                if( max_count > 1 ){                                    // sg_type='joint'
                    t_counter.forEach((value, key) => {
                        if (value === max_count) root = key;
                    });
                }
                // console.log('** root:', root, '<== nodes=', t_nodes, ', edges=', t_edges);
                nodes.get(root)['borderWidth'] = 2;     // root 노드 강조!

                //////////////////////////////

                // create a network
                let container = this.subVisContainers.nativeElement.children[sg_idx];
                let options = {
                    edges: {
                        arrows: { to: {enabled: true, type: 'arrow', scaleFactor: 0.5} },
                    },
                    layout: {
                        randomSeed: root,
                    }
                };
                this.subGraphs[sg_idx] = new vis.Network(container, {nodes: nodes, edges: edges}, options);

                // next
                sg_idx += 1;
                if( sg_idx >= this.sizeOfSubGraphs ) break;
            }
            if( sg_idx >= this.sizeOfSubGraphs ) break;
        }
    }
*/

