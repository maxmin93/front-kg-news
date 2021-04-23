import { Component, OnInit, OnDestroy, ChangeDetectorRef, EventEmitter, ViewChild, ElementRef, Input, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subscription, Subject, BehaviorSubject, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { IElement, IGraph, EMPTY_GRAPH, IEvent } from '../../../services/graph-models';
import { CY_STYLES, CY_EVT_INIT } from '../../../services/cy-styles';

import { clone, cloneDeep, concat, debounce } from 'lodash-es';
// import * as _ from 'lodash';

declare const window:any;
declare const cytoscape:any;
declare const tippy:any;

const CY_CONFIG:any ={
    layout: { name: "concentric"
        , fit: false, padding: 100, randomize: false, animate: false, positions: undefined
        , zoom: undefined, pan: undefined, ready: undefined, stop: undefined
        // specific features of concentric
        , minNodeSpacing: 60, startAngle: 3 / 2 * Math.PI, equidistant: false, avoidOverlap: true
        , concentric: function( node ){
                return node.degree();
        }
        , levelWidth: function( nodes ){
                return 2;
        }
    },
    // initial viewport state:
    zoom: 1,
    minZoom: 1e-2,
    maxZoom: 1e1,
    wheelSensitivity: 0.2,
    boxSelectionEnabled: true,
    motionBlur: true,
    selectionType: "single",
    // autoungrabify: true        // cannot move node by user control
};


@Component({
    selector: 'app-w2v-canvas',
    templateUrl: './w2v-canvas.component.html',
    styleUrls: ['./w2v-canvas.component.scss']
})
export class W2vCanvasComponent implements OnInit {

    // for Cytoscape.js
    private g: IGraph = undefined;
    private cyPrevEvent:IEvent = { type: undefined, data: undefined };  // 중복 idle 이벤트 제거용
    private dispLayouts:string[] = [ 'random', 'breadthfirst', 'circle', 'concentric', 'klay', 'dagre', 'euler' ];

    cy: any = undefined;                  // cytoscape.js
    private graph$ = new BehaviorSubject<IGraph>(EMPTY_GRAPH);

    // for doubleTap
    private tappedBefore:any;
    private tappedTimeout:any;
    // private tappedTarget:any;
    // private tappedCount:number = 0;

    // interface
    @Input() set graph(g:any) { this.graph$.next(g); }
    @Output() userEvent= new EventEmitter<any>();         // click, select, etc..

    // components
    @ViewChild("cy", {read: ElementRef, static: false}) divCy: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.graph$.subscribe(x => {
            if( !x || !x['datasource'] ) return;
            this.g = <IGraph>x;
            setTimeout(()=>{
                this.loadGraph(x);
            }, 1);
        });
    }

    ngOnDestroy(): void{
        // https://atomiks.github.io/tippyjs/methods/#destroy
        if( this.cy ){
            this.cy.nodes().forEach(e=>{
            if( e.scratch('_tippy') ) e.scratch('_tippy').destroy();
            });
            if( !this.cy.destroyed() ) this.cy.destroy();
        }
        this.cy = window['cy'] = undefined;
        this.g = EMPTY_GRAPH;
    }

    sendUserEvent(_type: string, data: any){
        // console.log(`userEvent: { ${evtKey}: ${evtData} }`)
        let event: any = {
            _type : _type,
            data: data
        }
        this.userEvent.emit(event);
    }

    //////////////////////////////////////////////

    private setStyleNode(e:any){
        if( e.scratch('_color') ){
            e.style('background-color', e.scratch('_color')[0]);
            e.style('text-halign', 'right');
            // depend on data
            e.style('label', e.data('name'));
        }
    }

    private setStyleEdge(e:any){
        if( e.scratch('_color') ){
            e.style('target-arrow-color', e.scratch('_color')[1]);
            e.style('line-gradient-stop-colors', e.scratch('_color'));
            e.style('target-text-rotation', 'autorotate');
            e.style('target-text-offset', '50px');
            e.style('target-text-margin-y', '18px');
            // depend on data
            e.style('target-label', e.data('properties')['score'].toFixed(5));
            e.style('width', Math.round(e.data('properties')['score']*10));
        }
    }

    loadGraph(g:IGraph){
        // for DEBUG
        // if( localStorage.getItem('debug')=='true' ) console.log('loadGraph', g);

        let config:any = Object.assign( cloneDeep(CY_CONFIG), {
            container: this.divCy.nativeElement,
            elements: concat(g.nodes, g.edges),
            style: CY_STYLES,
            pan: { x:0, y:0 },
            ready: (e)=>{
                let cy = e.cy;
                cy.scratch('_datasource', g.datasource);
                cy.nodes().forEach(e => this.setStyleNode(e));
                cy.edges().forEach(e => this.setStyleEdge(e));
            }
        });

        this.cyInit(config);
    }

    extendGraph(g:IGraph){
        console.log('extend graph:', g);
    }

    //////////////////////////////////////////////

    cyInit(config:any){
        cytoscape.warnings(false);                      // ** for PRODUCT : custom wheel sensitive
        this.cy = window['cy'] = cytoscape(config);

        ///////////////////////////////
        // register event-handlers
        ///////////////////////////////
        let cy = this.cy;

        // right-button click : context-menu on node
        cy.on('cxttap', (e)=>{
            if( e.target === cy ){
            }
            // **NOTE: ngx-contextmenu is FOOLISH! ==> do change another!
            else if( e.target.isNode() ){
            }

            e.preventDefault();
            e.stopPropagation();
        });

        // ** 탭 이벤트를 cyEventsMapper()로 전달
        cy.on('tap', (e)=>{
            let tappedNow = e.target;
            if( this.tappedTimeout && this.tappedBefore) {
                clearTimeout(this.tappedTimeout);
            }
            if( this.tappedBefore === tappedNow ){
                e.target.trigger('doubleTap', e);
                e.originalEvent = undefined;
                this.tappedBefore = null;
            }
            else{
                this.tappedTimeout = setTimeout(()=>{
                    if( e.target === cy ){    // click background

                    }                         // click node
                    else if( e.target.isNode() ){   // || e.target.isEdge() ){
                        // console.log({ type: 'node-click', data: e.target.data() });
                        this.sendUserEvent('click', e.target.data());
                    }
                    this.tappedBefore = null;
                }, 300);
                this.tappedBefore = tappedNow;
            }
        });

        // trigger doubleTap event
        // https://stackoverflow.com/a/44160927/6811653
        cy.on('doubleTap', debounce( (e, originalTapEvent) => {
            if( e.target !== cy && e.target.isNode() ){
                // console.log({ type: 'node-dblclick', data: e.target.data() });
                this.sendUserEvent('dbl-click', e.target.data());
            }
        }), 500);

        cy.on('boxselect', debounce( (e)=>{

        }), 500);

        cy.on('dragfree','node', (e)=>{
            let pos = e.target.position();
            e.target.scratch('_pos', clone(pos));
        });

        cy.on('select','node', (e)=>{
            e.target.style('background-color', '#fff');
            e.target.style('border-color', e.target.scratch('_color')[0]);
            e.target.style('border-opacity', 1);
            if( e.target.scratch('_tippy') ) e.target.scratch('_tippy').hide();
        });

        cy.on('unselect','node', (e)=>{
            e.target.style('background-color', e.target.scratch('_color')[0]);
            e.target.style('border-color', '#fff');
            if( e.target.scratch('_tippy') ) e.target.scratch('_tippy').hide();
        });

        // ** node 선택을 위한 편의 기능 (뭉쳤을때)
        cy.on('mouseover', 'node', debounce( (e)=>{
            let node = e.target;
            if( node && !node.selected() ){
                // ...
            }
        }, 200));
    }

}
