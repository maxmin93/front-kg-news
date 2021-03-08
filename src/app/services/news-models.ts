export class User {
    id: number;
    username: string;
    email: string;
}

export class UserRegister extends User {
    password: string;
    fullName: string;
    imageUrl: string;
}

export interface News {
    id: string;
    title: string;
    content: string;
    link: string;       // .split(" ")
    tokens?: string;
    cate1?: string;
    cate2?: string;
    provider: string;
    timestamp: string;
    wdate?: Date;
}

export interface NewsResponse {
    hits: number;
    page_size: number;
    page_index: number;
    documents: News[];
}

export class Articles {
    status: string;
    totalResults: number;
    articles: Article[];
}

// https://medium.com/@slevrard2/building-a-news-aggregator-web-app-with-angular-4f57079ebe51

export class Article {
    author: string;
    content: string;
    description: string;
    publishedAt: string;
    source: Source;
    title: string;
    url: string;
    urlToImage: string;
}

export class Source {
    id: string;
    name: string;
}

export const initialArticles: Articles = {
    status: '',
    totalResults: 0,
    articles: []
}
