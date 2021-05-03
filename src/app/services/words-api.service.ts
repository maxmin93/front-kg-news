import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';

import { NewsConfig } from '../app.config';


@Injectable({
  providedIn: 'root'
})
export class WordsApiService {

    // URL to web api
    private api_url = NewsConfig + '/words';

    constructor(private http: HttpClient) { }


    ///////////////////////////////////////////////////////
    //  Words browser
    //

    // return: { label: [[token, sum_tf, df, log10_tfidf], ..]}
    getW2vPivots(): Observable<any>{
        let url = `${this.api_url}/w2v/pivots`;
        return this.http.get<any>(url);
    }

    getW2vSynonyms(pivot: string, num: number=20): Observable<any[]>{
        let url = `${this.api_url}/w2v/synonyms/${encodeURIComponent(pivot)}?num=${num}`;
        return this.http.get<any[]>(url);
    }

    getW2vGraph(pivot: string, num: number=20): Observable<any>{
        let url = `${this.api_url}/w2v/graph/${encodeURIComponent(pivot)}?num=${num}`;
        return this.http.get<any>(url);
    }

    ///////////////////////////////////////////////////////
    //  Dashboard
    //

    // return: [[token, sum_tf, df, log10_tfidf], ..]
    getW2vPivotsOfLabel(label: string): Observable<any[][]>{
        let url = `${this.api_url}/w2v/pivots/${label.toUpperCase()}`;
        return this.http.get<any[][]>(url);
    }

    getStatDfOfNouns(): Observable<any[][]>{
        let url = `${this.api_url}/stat/nouns_df`;
        return this.http.get<any[][]>(url);
    }

    getStatDfOfEntities(): Observable<any[][]>{
        let url = `${this.api_url}/stat/entities_df`;
        return this.http.get<any[][]>(url);
    }

    getStatLabelsOfEntities(): Observable<any[][]>{
        let url = `${this.api_url}/stat/entities_labels`;
        return this.http.get<any[][]>(url);
    }

    getStatDf(){
        return forkJoin({
            nouns: this.getStatDfOfNouns(),
            entities: this.getStatDfOfEntities()
        })
    }

}
