import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { WordsApiService } from 'src/app/services/words-api.service';
import { UiApiService } from '../../services/ui-api.service';
import { ColorProviderService } from '../../services/color-provider.service';

import tippy from 'tippy.js';
// declare const tippy:any;

import { ILabel, IElement, IGraph } from '../../services/graph-models';

import { MatDialog } from '@angular/material/dialog';
import { W2vDialogComponent } from './w2v-dialog/w2v-dialog.component';
import { W2vCanvasComponent } from './w2v-canvas/w2v-canvas.component';


@Component({
    selector: 'app-w2v-browser',
    templateUrl: './w2v-browser.component.html',
    styleUrls: ['./w2v-browser.component.scss']
})
export class W2vBrowserComponent implements OnInit, OnDestroy, AfterViewInit {

    showSearch: boolean = false;
    searchStr: string;

    pivot: string;
    pivots: any;            // W2vDialog { label: [[noun, tf, df, tfidf], ..], }
    words: Set<string>;     // unique synonyms 유지 (확장시 체크)
    graph: IGraph;

    debug: boolean = false;
    handler_pivots:Subscription;
    // handler_synonyms:Subscription;   // 사용 안함
    handler_graph:Subscription;

    @ViewChild('tippy_test', {static: false}) private tippy_test: ElementRef;
    @ViewChild('canvas', {static: false}) private graphCanvas: W2vCanvasComponent;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private wordsService: WordsApiService,
        private colorService: ColorProviderService,
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
                if( this.pivot ) this.load_w2v_graph(this.pivot);
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });
    }

    ngAfterViewInit(): void{
        // tippy( this.tippy_test.nativeElement, {
        //     content: 'My tooltip!',
        //     theme: 'light',
        //     placement: 'top-start',
        //     arrow: true,
        // });
    }

    ngOnDestroy(): void{
        if(this.handler_pivots) this.handler_pivots.unsubscribe();
        // if(this.handler_synonyms) this.handler_synonyms.unsubscribe();
        if(this.handler_graph) this.handler_graph.unsubscribe();
    }

    load_w2v_graph(pivot: string){
        // get data
        this.handler_pivots = this.getW2vPivots();
        // this.handler_synonyms = this.getW2vSynonyms(pivot);
        this.handler_graph = this.getW2vGraph(pivot);
    }

    //////////////////////////////////////////////
    //  APIs
    //

    // Dialog 에서 사용
    // return: { label: [[noun, tf, df, tfidf], ..], }
    getW2vPivots(): Subscription{
        return this.wordsService.getW2vPivots().subscribe(x=>{
            this.pivots = x;
        });
    }

    // 사용 안함
    // return: [ [noun, score], .. ]
    // getW2vSynonyms(pivot: string): Subscription{
    //     return this.wordsService.getW2vSynonyms(pivot).subscribe(x=>{
    //         console.log('synonyms:', x);
    //         this.synonyms = x;
    //     });
    // }

    // return: { pivot, nodes[], edges_syn[], edges_fof[] }
    getW2vGraph(pivot: string): Subscription{
        return this.wordsService.getW2vGraph(pivot).subscribe(x=>{
            this.words = new Set([pivot, ...x['nodes']]);
            this.graph = this.makeGraph(x);
            console.log('graph:', this.graph);
        });
    }

    // return: { pivot, nodes[], edges_syn[], edges_fof[] }
    getW2vGraphExtend(pivot: string): Subscription{
        return this.wordsService.getW2vGraph(pivot).subscribe(x=>{
            let new_nodes: Set<string> = new Set(x['nodes']);
            let diff_nodes = new Set([...new_nodes].filter(n => !this.words.has(n)));
            let diff_edges = x['edges_syn'].filter(e => diff_nodes.has(e[1]));
            let diff_graph = {
                pivot: pivot,
                nodes: [...diff_nodes],
                edges_syn: diff_edges
            }

            let ext_graph: IGraph = this.makeGraph(diff_graph);
            console.log('graph.extend:', ext_graph);
            // let pivots = new Set([pivot]);
            this.words = new Set([...this.words, ...diff_nodes]);     // union
            console.log('words.extend:', diff_nodes);
        });
    }

    makeGraph(data: any, nodes: Map<string,IElement> = undefined): IGraph{
        let idx = -1;
        if( !nodes ){
            nodes = new Map();
            nodes.set( data.pivot, this.createElement('nodes', ++idx, data.pivot) );
        }
        else{

        }

        for(let e of data.nodes){
            nodes.set( e, this.createElement('nodes', ++idx, e) );
        }
        // console.log('nodes =', nodes.values());

        let edges: IElement[] = [];
        let rnk = -1;
        for(let e of data.edges_syn){
            edges.push(
                this.createElement('edges', ++rnk, e[0]+'_'+e[1], {score: e[2], rank: rnk, relation: 'syn'},
                    nodes.get(e[0]), nodes.get(e[1]))
            );
        }
        // ** FOF 의 edge 가 중복되어 일단 주석처리
        //    그리고, 당장은 의미 없는 관계
        // for(let e of data.edges_fof){
        //     edges.push(
        //         this.createElement('edges', ++rnk, e[0]+'_'+e[1], {score: e[2], rank: rnk, relation: 'fof'},
        //             nodes.get(e[0]), nodes.get(e[1]))
        //     );
        // }
        // console.log('edges =', edges);

        return <IGraph>{
            datasource: data.pivot,
            nodes: [...nodes.values()],     // convert iterable to array
            edges: edges
        };
    }

    createElement(group: string, index: number, name: string, properties: any = {}
        , source: IElement = undefined, target: IElement = undefined
    ): IElement{
        return <IElement> {
            group: group,
            data: {
                id: (group == 'nodes' ? 'n' : 'e')+index,
                name: name,
                properties: properties,
                source: group == 'nodes' ? undefined : source.data.id,
                target: group == 'nodes' ? undefined : target.data.id
            },
            scratch: {
                _index: index,
                _color: group == 'nodes' ?
                        [this.colorService.next(), undefined] :
                        [source.scratch._color[0], target.scratch._color[0]],
                _source: group == 'nodes' ? undefined : source,
                _target: group == 'nodes' ? undefined : target
            }
        };
    }

    //////////////////////////////////////////////

    searchToggle(value:boolean){
        this.showSearch = value;
    }

    searchSubmit(searchStr: string){
        console.log('searchStr:', searchStr);
        this.searchToggle(false);

        this.pivot = searchStr.trim();
        this.load_w2v_graph(this.pivot);
    }

    receiveUserEvent(event){
        console.log('userEvent:', event);
        if( event._type == 'dbl-click' ){
            this.searchSubmit(event.data['name']);
        }
        else if( event._type == 'click' ){
            this.getW2vGraphExtend(event.data['name']);
            this.graphCanvas.extendGraph(undefined);
        }
    }

    openDialog() {
        const dialogRef = this.pivotsDialog.open(W2vDialogComponent, {
            width : '800px',
            height: '740px',
            data: this.pivots
        });

        dialogRef.afterClosed().subscribe(result => {
            this.searchStr = result.noun;
            this.searchSubmit(this.searchStr);
        });
    }
}
