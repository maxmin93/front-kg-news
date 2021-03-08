import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { of } from 'rxjs';
import { NewsApiService } from 'src/app/services/news-api.service';
import { News } from 'src/app/services/news-models';

// import { map } from 'rxjs/operators';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit, AfterViewInit {

    detail: any;

    docid: string;
    news: News;

    debug: boolean = false;

    constructor(
        private route: ActivatedRoute,
        private cd: ChangeDetectorRef,
        private newsService: NewsApiService
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            // console.log('paramMap:', params.get('id'));
            this.docid = params.get('id');
            console.log('docid:', this.docid);

            this.newsService.getNewsById(this.docid).subscribe(x=>{
                if( x.length == 0 ){
                    console.log(`Empty response by docid=[${this.docid}]`);
                }

                this.news = x[0];
                this.detail = {
                    'title': this.news.title,
                    'cate': this.news.cate1+'/'+this.news.cate2,
                    'content': this.news.content,
                    'wdate': new Date(this.news.timestamp),
                    'provider': this.news.provider,
                    'link': this.news.link
                };
            });
            //this.cd.detectChanges();
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });
    }

    ngAfterViewInit(): void{
    }

    goSource(){
        window.open(this.news.link,'name','width=600,height=400')
    }

}
