import { Component, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';

import { ActivatedRoute } from '@angular/router';
import { UiApiService } from '../../services/ui-api.service';

// chart.js
import { ChartDatasets, ChartLabel, ChartOptions } from "@rinminase/ng-charts";


// enum 대신 UnionType 사용
// 참고: https://engineering.linecorp.com/ko/blog/typescript-enum-tree-shaking/
const CHART_TYPE = {
    LINE: 'line_chart',
    BAR: 'bar_chart'
} as const;
type CHART_TYPE = typeof CHART_TYPE[keyof typeof CHART_TYPE];


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
    /** Based on the screen size, switch from standard to one column per row */
    cards = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
        map(({ matches }) => {
            if (matches) {
                return [
                    { title: 'Card 1', chart_type: CHART_TYPE.BAR, cols: 1, rows: 1 },
                    { title: 'Card 2', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 },
                    { title: 'Card 3', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 },
                    { title: 'Card 4', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 }
                ];
            }

            return [
                { title: 'Card 1', chart_type: CHART_TYPE.BAR, cols: 2, rows: 1 },
                { title: 'Card 2', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 },
                { title: 'Card 3', chart_type: CHART_TYPE.LINE, cols: 1, rows: 2 },
                { title: 'Card 4', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 }
            ];
        })
    );


    chartOptions: ChartOptions = {
        responsive: true,
        scales: { xAxes: [{}], yAxes: [{}] },
        plugins: {
            datalabels: {
                anchor: "end",
                align: "end",
            },
        },
    };
    chartLabels: ChartLabel[] = [
        "2006",
        "2007",
        "2008",
        "2009",
        "2010",
        "2011",
        "2012",
    ];
    chartLegend = true;
    chartPlugins = [];
    chartData: ChartDatasets = [
        { data: [65, 59, 80, 81, 56, 55, 40], label: "Series A" },
        { data: [28, 48, 40, 19, 86, 27, 90], label: "Series B" },
    ];




    // private barChart: Chart;
    @ViewChild('barChart', {static: false}) barChartRef: ElementRef;
    // private lineChart: Chart;
    @ViewChild('lineChart', {static: false}) lineChartRef: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private breakpointObserver: BreakpointObserver
    ) {}

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });
    }

    ngAfterViewInit(): void {
        // this.barChart = this.initBarChart()
    }

    ////////////////////////////////////////////////

    // Disregard this function, as this just randomizes the values in an array
    randomizer(): void {
        let values = this.chartData[0].data;
        const returnValue = [];
        values.forEach(() => {
            returnValue.push(Math.round(Math.random() * 100));
        });
        this.chartData[0].data = returnValue;
    }

    /*
    initBarChart(): Chart {
        let labels = ['1월','2월','3월','4월','5월','6월','7월'];
        let data = {
          labels: labels,
          datasets: [{
            label: 'My First Dataset',
            data: [65, 59, 80, 81, 56, 55, 40],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(255, 159, 64, 0.2)',
              'rgba(255, 205, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(201, 203, 207, 0.2)'
            ],
            borderColor: [
              'rgb(255, 99, 132)',
              'rgb(255, 159, 64)',
              'rgb(255, 205, 86)',
              'rgb(75, 192, 192)',
              'rgb(54, 162, 235)',
              'rgb(153, 102, 255)',
              'rgb(201, 203, 207)'
            ],
            borderWidth: 1
          }]
        };

        let chart = new Chart(this.barChartRef.nativeElement, {
            type: 'bar',
            data: data,
            options: {
                scales: {
                    y: {
                      beginAtZero: true
                    }
                }
            }
        });
        return chart;
    }
    */
}
