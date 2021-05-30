import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin, EMPTY } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';

import { NewsConfig } from '../app.config';


@Injectable({
  providedIn: 'root'
})
export class WordsApiService {

    // URL to web api
    private api_url = NewsConfig.URL + '/words';

    constructor(private http: HttpClient) { }


    ///////////////////////////////////////////////////////
    //  Word2Vec APIs
    //

    // return: { label: [[token, sum_tf, df, log10_tfidf], ..]}
    getW2vWordsTopN(topN:number=50): Observable<any>{
        let url = `${this.api_url}/w2v/words/${topN}`;
        return this.http.get<any>(url);
    }

    getW2vWords(words:string[]): Observable<any>{
        if( words.length == 0 ) return EMPTY;
        let url = `${this.api_url}/w2v/word?w=${words.map(x=>encodeURIComponent(x)).join('&w=')}`;
        return this.http.get<any>(url);
    }

    getW2vSimilarsOfWord(word: string, topN: number=20): Observable<any[]>{
        let url = `${this.api_url}/w2v/similars/${encodeURIComponent(word)}?top_n=${topN}`;
        return this.http.get<any[]>(url);
    }

    getW2vSimilarsOfWords(positives: string[], negatives: string[]=[], topN: number=20): Observable<any[]>{
        if( positives.length == 0 ) return EMPTY;
        let params = 'p=' + positives.map(x=>encodeURIComponent(x)).join('&p=')
        if( negatives.length > 0 ){
            params += '&n=' + negatives.map(x=>encodeURIComponent(x)).join('&n=')
        }
        let url = `${this.api_url}/w2v/similars/words?${params}&top_n=${topN}`;
        return this.http.get<any[]>(url);
    }

    getW2vSimilarity(w1: string, w2: string): Observable<any[]>{
        let url = `${this.api_url}/w2v/similarity?w1=${encodeURIComponent(w1)}&w2=${encodeURIComponent(w2)}`;
        return this.http.get<any[]>(url);
    }

    getW2vWordsGraph(positives: string[], negatives: string[]=[], topN: number=20, threshold: number=0.65): Observable<any[]>{
        if( positives.length == 0 ) return EMPTY;
        let params = 'p=' + positives.map(x=>encodeURIComponent(x)).join('&p=')
        if( negatives.length > 0 ){
            params += '&n=' + negatives.map(x=>encodeURIComponent(x)).join('&n=')
        }
        let url = `${this.api_url}/w2v/similars/words?${params}&top_n=${topN}&threshold=${threshold}`;
        return this.http.get<any[]>(url);
    }


    ///////////////////////////////////////////////////////
    //  Node2Vec APIs
    //

    // return: { label: [[token, sum_tf, df, log10_tfidf], ..]}
    getN2vWordsTopN(topN:number=50): Observable<any>{
        let url = `${this.api_url}/n2v/words/${topN}`;
        return this.http.get<any>(url);
    }

    getN2vWords(words:string[]): Observable<any>{
        if( words.length == 0 ) return EMPTY;
        let url = `${this.api_url}/n2v/word?w=${words.map(x=>encodeURIComponent(x)).join('&w=')}`;
        return this.http.get<any>(url);
    }

    getN2vSimilarsOfWord(word: string, topN: number=20): Observable<any[]>{
        let url = `${this.api_url}/n2v/similars/${encodeURIComponent(word)}?top_n=${topN}`;
        return this.http.get<any[]>(url);
    }

    getN2vSimilarsOfWords(positives: string[], negatives: string[]=[], topN: number=20): Observable<any[]>{
        if( positives.length == 0 ) return EMPTY;
        let params = 'p=' + positives.map(x=>encodeURIComponent(x)).join('&p=')
        if( negatives.length > 0 ){
            params += '&n=' + negatives.map(x=>encodeURIComponent(x)).join('&n=')
        }
        let url = `${this.api_url}/n2v/similars/words?${params}&top_n=${topN}`;
        return this.http.get<any[]>(url);
    }

    getN2vSimilarity(w1: string, w2: string): Observable<any[]>{
        let url = `${this.api_url}/n2v/similarity?w1=${encodeURIComponent(w1)}&w2=${encodeURIComponent(w2)}`;
        return this.http.get<any[]>(url);
    }

    getN2vWordsGraph(positives: string[], negatives: string[]=[], topN: number=20, threshold: number=0.60): Observable<any[]>{
        if( positives.length == 0 ) return EMPTY;
        let params = 'p=' + positives.map(x=>encodeURIComponent(x)).join('&p=')
        if( negatives.length > 0 ){
            params += '&n=' + negatives.map(x=>encodeURIComponent(x)).join('&n=')
        }
        let url = `${this.api_url}/n2v/graph?${params}&top_n=${topN}&threshold=${threshold}`;
        return this.http.get<any[]>(url);
    }


    ///////////////////////////////////////////////////////
    //  Dashboard
    //

    // return: { entity: [[token, sum_tf, df, log10_tfidf], ..], .. }
    getStatTfidfOfEntities(): Observable<any[][]>{
        let url = `${this.api_url}/stat/tfidf/entities`;
        return this.http.get<any[][]>(url);
    }

    // return: [[token, sum_tf, df, log10_tfidf], ..]
    getStatTfidfOfEntity(entityLabel: string): Observable<any[][]>{
        let url = `${this.api_url}/stat/tfidf/${entityLabel.toUpperCase()}`;
        return this.http.get<any[][]>(url);
    }

    getStatDfOfNouns(): Observable<any[][]>{
        let url = `${this.api_url}/stat/df/nouns`;
        return this.http.get<any[][]>(url);
    }

    getStatDfOfEntities(): Observable<any[][]>{
        let url = `${this.api_url}/stat/df/entities`;
        return this.http.get<any[][]>(url);
    }

    getStatDfOfEntityLabels(): Observable<any[][]>{
        let url = `${this.api_url}/stat/df/entities_labels`;
        return this.http.get<any[][]>(url);
    }

    getStatDf(){
        return forkJoin({
            nouns: this.getStatDfOfNouns(),
            entities: this.getStatDfOfEntities()
        })
    }

}
