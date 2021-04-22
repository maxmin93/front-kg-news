import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';

import { NewsConfig } from '../app.config';
import { NewsResponse, Document, Sentence, Token } from './news-models';

@Injectable({
  providedIn: 'root'
})
export class NewsApiService {

    // 뉴스 서비스 : 한국 뉴스는 top-headlines 와 카테고리 분류만 제공
    //               (source-id 없음, 한글 검색 안됨)
    // https://newsapi.org/docs/get-started
    private api_key = "750e2011f5cc43a783684f9a615ac6e2";
    private category = ['business','entertainment','general','health','science','sports','technology'];
    private country = "kr";

    // URL to web api
    private api_url = 'http://127.0.0.1:8888/news';   // 'http://newsapi.org/v2/top-headlines?country=kr&apiKey=';

    constructor(private http: HttpClient) { }

    /*
    initSources(){
        return this.http.get('https://newsapi.org/v2/sources?language=en&apiKey='+this.api_key);
    }
    initArticlesKr(){
        return this.http.get('https://newsapi.org/v2/top-headlines?country=kr&apiKey='+this.api_key);
    }
    initArticles(){
        return this.http.get('https://newsapi.org/v2/top-headlines?sources=techcrunch&apiKey='+this.api_key);
    }
    getArticlesByID(source: String){
        return this.http.get('https://newsapi.org/v2/top-headlines?sources='+source+'&apiKey='+this.api_key);
    }
    */

    private convertStr2Date = function(x:NewsResponse): NewsResponse {
        for( let d of x.documents ){
            try{
                d.wdate = new Date(d.timestamp);
                d.category = d.category.replace('|','/')
            }catch(e){
                d.wdate = undefined
            }
        }
        return x;
    }


    ///////////////////////////////////////////////////////
    //  Documents list
    //

    getNewsResponse(text:string='', size=10, page=0): Observable<NewsResponse>{
        let url = `${this.api_url}/search?size=${size}&page=${page}&q=${encodeURIComponent(text)}`;
        return this.http.get<NewsResponse>(url).pipe(
            map(x=>this.convertStr2Date(x))
        );
    }


    ///////////////////////////////////////////////////////
    //  Document detail
    //

    getNewsById(docid:string): Observable<Document[]>{
        let url = `${this.api_url}/${docid}`;
        return this.http.get<NewsResponse>(url).pipe(
            map(x=>this.convertStr2Date(x)),
            map(x=>x.documents),
            take(1)
        );
    }

    getSentences(docid:string): Observable<Sentence[]>{
        let url = `${this.api_url}/${docid}/sentences`;
        return this.http.get<Sentence[]>(url);
    }

    getAggTerms(docid:string): Observable<any>{
        let url = `${this.api_url}/${docid}/terms/agg`;
        return this.http.get<any>(url);
    }

    getEntityNouns(docid:string): Observable<any>{
        let url = `${this.api_url}/${docid}/nouns/agg`;
        return this.http.get<any>(url);
    }

    getTerms(docid:string, grp:string='nouns'): Observable<Token[]>{
        let url = `${this.api_url}/${docid}/terms?grp=${grp}`;
        return this.http.get<Token[]>(url);
    }

    getTextRank(docid:string): Observable<any[]>{
        let url = `${this.api_url}/${docid}/textrank`;
        return this.http.get<any[]>(url).pipe( map(rows=>{
            for( let r of rows ){
                r[1] = Math.round(r[1] * 10000) / 10000;
            }
            return rows;
        }));
    }


    ///////////////////////////////////////////////////////
    //  Dashboard
    //

    cntDocuments(): Observable<number>{
        let url = `${this.api_url}/cnt/document`;
        return this.http.get<number>(url);
    }

    aggNewsMonth(): Observable<any>{
        let url = `${this.api_url}/agg/month`;
        return this.http.get<any>(url);
    }


}

