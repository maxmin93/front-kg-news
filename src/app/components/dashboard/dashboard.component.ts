import { Component, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';

import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { Router, ActivatedRoute } from '@angular/router';
import { UiApiService } from 'src/app/services/ui-api.service';
import { NewsApiService } from 'src/app/services/news-api.service';
import { WordsApiService } from 'src/app/services/words-api.service';

declare const Chart: any;           // chart.js@^2.9.4
declare const ChartDataLabels: any; // chartjs-plugin-datalabels@^1.0.0


// enum 대신 UnionType 사용
// 참고: https://engineering.linecorp.com/ko/blog/typescript-enum-tree-shaking/
const CHART_TYPE = {
    LINE: 'line_chart',
    BAR: 'bar_chart'
} as const;
type CHART_TYPE = typeof CHART_TYPE[keyof typeof CHART_TYPE];

const CHART_COLORS = {
    green: {
      fill: '#e0eadf',
      stroke: '#5eb84d',
    },
    darkBlue: {
      fill: '#92bed2',
      stroke: '#3282bf',
    },
    purple: {
      fill: '#8fa8c8',
      stroke: '#75539e',
    },
};

const PIE_COLORS = [
    ['rgb(44, 177, 236)', 'rgba(44, 177, 236,0.2)'],    // '#2cb1ec',
    ['rgb(49, 116, 135)', 'rgba(49, 116, 135,0.2)'],    // '#317487',
    ['rgb(95, 172, 58)', 'rgba(95, 172, 58,0.2)'],    // '#5fac3a',
    ['rgb(166, 223, 182)', 'rgba(166, 223, 182,0.2)'],    // '#a6dfb6',
    ['rgb(105, 106, 90)', 'rgba(105, 106, 90,0.2)'],    // '#696a5a',
    ['rgb(233, 219, 158)', 'rgba(233, 219, 158,0.2)'],    // '#e9db9e',
    ['rgb(255, 212, 118)', 'rgba(255, 212, 118,0.2)'],    // '#ffd476',
    ['rgb(225, 56, 99)', 'rgba(225, 56, 99,0.2)'],    // '#e13863',
    ['rgb(208, 120, 82)', 'rgba(208, 120, 82,0.2)'],    // '#d07852',
    ['rgb(47, 87, 157)', 'rgba(47, 87, 157,0.2)'],    // '#2f579d',
    ['rgb(84, 179, 235)', 'rgba(84, 179, 235,0.2)'],    // '#54b3eb',
    ['rgb(55, 98, 105)', 'rgba(55, 98, 105,0.2)'],    // '#376269',
    ['rgb(154, 195, 54)', 'rgba(154, 195, 54,0.2)'],    // '#9ac336',
    ['rgb(32, 54, 75)', 'rgba(32, 54, 75,0.2)'],      // '#20364b',
];


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {

    gridLayout: any;

    private barChart: any;
    @ViewChild('barChart', {static: false}) barChartRef: ElementRef;
    @ViewChild('barChartContainer', {static: false}) barChartContainer: ElementRef;
    private lineChart: any;
    @ViewChild('lineChart', {static: false}) lineChartRef: ElementRef;
    @ViewChild('lineChartContainer', {static: false}) lineChartContainer: ElementRef;
    private pieChart: any;
    @ViewChild('pieChart', {static: false}) pieChartRef: ElementRef;
    @ViewChild('pieChartContainer', {static: false}) pieChartContainer: ElementRef;

    docCount: number;
    labelsSize: number;
    selectedEntity: string = 'PERSON';
    displayedColumns: string[] = ['noun', 'sum_tf', 'df', 'log10tf_idf'];
    dataSource = new MatTableDataSource<any[]>();
    @ViewChild('paginator', {static: false}) paginator: MatPaginator;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private uiService: UiApiService,
        breakpointObserver: BreakpointObserver,
        private newsApi: NewsApiService,
        private wordsApi: WordsApiService
    ) {
        // Handset 디스플레이 감지 ==> grid-tile 사이즈 변경
        // https://material.angular.io/cdk/layout/overview#default-breakpoints
        breakpointObserver.observe([
            Breakpoints.HandsetLandscape,
            Breakpoints.HandsetPortrait
        ]).subscribe(result => {
            console.log('detect Handset:', result);
            if (result.matches) {
                // grid-tile 사이즈 변경
                this.gridLayout = {
                    cols: 1, rowHeight: 320,
                    cards: [
                        { colspan: 1, rowspan: 1, width: 290, height: 200 },     // cards[0]: agg_month bar
                        { colspan: 1, rowspan: 1, width: 290, height: 200 },     // cards[1]: df line
                        { colspan: 1, rowspan: 2, width: 290, height: 200 },     // cards[2]: entity table
                        { colspan: 1, rowspan: 1, width: 290, height: 200 },     // cards[3]: entity pie
                    ],
                    table: { pageSize: 5, hidePageSize: true }
                };
            }
            else{
                this.gridLayout = {
                    cols: 2, rowHeight: 360,
                    cards: [
                        { colspan: 2, rowspan: 1, width: 1200, height: 244 },     // cards[0]: agg_month bar
                        { colspan: 1, rowspan: 1, width: 560, height: 244 },     // cards[1]: df line
                        { colspan: 1, rowspan: 2, width: 560, height: 244 },     // cards[2]: entity table
                        { colspan: 1, rowspan: 1, width: 560, height: 244 },     // cards[3]: entity pie
                    ],
                    table: { pageSize: 10, hidePageSize: true }
                };
            }
        });
    }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });

        this.reloadChart('bar');
        this.reloadChart('line');
        this.reloadChart('pie');
        // this.wordsApi.getStatDf().subscribe(data=>{
        //     console.log(data);
        // });
    }

    ngAfterViewInit(): void {
        // chart.js: canvas sizes
        // 참고 https://ming9mon.tistory.com/108

        // this.gridLayout.cards[0].width = Math.floor(this.barChartContainer.nativeElement.offsetWidth/10)*10;
        // if( this.gridLayout.cards[0].width > 1200 ) this.gridLayout.cards[0].width = 1200;
        // this.gridLayout.cards[0].height = this.barChartContainer.nativeElement.offsetHeight-1;
        // console.log(`barChart: width: ${this.gridLayout.cards[0].width}, height: ${this.gridLayout.cards[0].height}`);
        // setTimeout(()=>{ this.barChart.resize(); }, 10);

        // load table
        this.loadTable(this.selectedEntity);
        // doc count
        this.loadDocCount();
    }


    ////////////////////////////////////////////////
    //  APIs
    //

    loadDocCount(){
        this.newsApi.cntDocuments().subscribe(data=>{
            this.docCount = data;
        });
    }

    loadBarChart(){
        this.newsApi.aggNewsMonth().subscribe(data => {
            let x_labels = Object.keys(data).map(x=>String(x));
            let y_values = Object.values(data).map(x=>Number(x));
            this.barChart = this.initBarChart(x_labels, y_values);
        })
    }

    loadLineChart(){
        this.wordsApi.getStatDf().subscribe(data => {
            const cumulativeSum = (sum => value => sum += value)(0);
            let nouns = {
                x_labels: data['nouns'].map(x=>x[0]),
                y_values: data['nouns'].map(x=>x[1])    //.map(cumulativeSum),
            };
            let entities = {
                x_labels: data['entities'].map(x=>x[0]),
                y_values: data['entities'].map(x=>x[1]).map(cumulativeSum),
            };
            this.lineChart = this.initLineChart(nouns.x_labels, [nouns.y_values, entities.y_values]);
        })
    }

    loadPieChart(){
        this.wordsApi.getStatLabelsOfEntities().subscribe(data=>{
            let x_labels = data.map(x=>x[0]);
            let y_values = data.map(x=>x[1]);
            this.labelsSize = x_labels.length;
            this.pieChart = this.initPieChart(x_labels, y_values);
        });
    }

    loadTable(label: string){
        this.wordsApi.getW2vPivotsOfLabel(label).subscribe(data=>{
            // console.log(data);
            this.dataSource.data = data;
            this.dataSource.paginator = this.paginator;
        });
    }

    ////////////////////////////////////////////////
    //  chart.js
    //

    reloadChart(target: string){
        if( target == 'bar'){
            if(this.barChart) this.barChart.reset();
            this.loadBarChart();
        }
        else if( target == 'line'){
            if(this.lineChart) this.lineChart.reset();
            this.loadLineChart();
        }
        else if( target == 'pie'){
            if(this.pieChart) this.pieChart.reset();
            this.loadPieChart();
        }
        else{
            // reload table
            this.loadTable(this.selectedEntity);
        }
    }

    initBarChart(x_labels: string[], y_values: number[]): any {
        let data = {
          labels: x_labels,
          datasets: [{
            label: 'news size',
            data: y_values,
            borderWidth: 1,
            backgroundColor: CHART_COLORS.darkBlue.fill,
            pointBackgroundColor: CHART_COLORS.darkBlue.stroke,
            borderColor: CHART_COLORS.darkBlue.stroke,
            pointHighlightStroke: CHART_COLORS.darkBlue.stroke,
            borderCapStyle: 'butt',
          }]
        };

        let chart = new Chart(this.barChartRef.nativeElement, {
            type: 'bar',
            data: data,
            options: {
                responsive: false,
                legend: { display: false },
                animation: { duration: 750, },
                scales: {
                    yAxes: [{
                        ticks: { beginAtZero: false }
                    }]
                }
            }
        });

        return chart;
    }

    initLineChart(x_labels: string[], y_values: number[][]): any {
        let data = {
            labels: x_labels,
            datasets: [{
                label: 'nouns',
                data: y_values[0],
                fill: true,
                backgroundColor: CHART_COLORS.purple.fill,
                pointBackgroundColor: CHART_COLORS.purple.stroke,
                borderColor: CHART_COLORS.purple.stroke,
                pointHighlightStroke: CHART_COLORS.purple.stroke,
                borderCapStyle: 'butt',
            },{
                label: 'entities (cumulative sum)',
                data: y_values[1],
                fill: true,
                backgroundColor: CHART_COLORS.green.fill,
                pointBackgroundColor: CHART_COLORS.green.stroke,
                borderColor: CHART_COLORS.green.stroke,
                pointHighlightStroke: CHART_COLORS.green.stroke,
            }],
        };

        let chart = new Chart(this.lineChartRef.nativeElement, {
            type: 'line',
            data: data,
            options: {
                responsive: false,
                legend: { display: true },
                animation: { duration: 750, },
                scales: {
                    yAxes: [{
                        ticks: { beginAtZero: false }
                    }]
                },
            }
        });

        return chart;
    }

    initPieChart(x_labels: string[], y_values: number[]): any {
        // let labels = ['UNKNOWN','PERSON','LOCATION','ORGANIZATION','EVENT'
        //             ,'WORK_OF_ART','CONSUMER_GOOD','OTHER','PHONE_NUMBER','ADDRESS'
        //             ,'DATE','NUMBER','PRICE','UNIT'];
        let data = {
          labels: x_labels,
          datasets: [{
            data: y_values,
            borderWidth: 1,
            borderColor: PIE_COLORS.map(x=>x[0]),
            backgroundColor: PIE_COLORS.map(x=>x[1]),
          }]
        };

        let chart = new Chart(this.pieChartRef.nativeElement, {
            type: 'pie',
            data: data,
            plugins: [ChartDataLabels],
            options: {
                responsive: false,
                legend: { display: false },
                animation: { duration: 750, },
                plugins: {
                    // https://quickchart.io/documentation/chart-js/custom-pie-doughnut-chart-labels/
                    datalabels: {
                        display: true,
                        formatter: (val, ctx) => {
                            return ctx.chart.data.labels[ctx.dataIndex];
                        },
                        align: 'top',
                        font: { size: 10, }
                        // color: '#000',
                        // backgroundColor: '#404040'
                    },
                }
            }
        });

        // click event on pie chart
        this.pieChartRef.nativeElement.addEventListener('click', (event)=>{
            let activePoints = chart.getElementsAtEvent(event);
            if( activePoints.length ){
                let _index = activePoints[0]['_index'];
                console.log('click:', _index, x_labels[_index]);

                // reload table
                this.selectedEntity = x_labels[_index];
                this.loadTable(this.selectedEntity);
            }
        });

        return chart;
    }

    onClickRecord(row: any[]){
        console.log(this.selectedEntity, row);
        this.router.navigate(['w2v-browser', row[0]]);
    }
}

