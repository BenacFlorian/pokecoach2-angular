import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { GraphqlClient, GRAPHQL_ENDPOINT } from './graphql-client';
import { GraphqlClientError } from './graphql-error';

describe('GraphqlClient', () => {
  let httpMock: HttpTestingController;
  let client: GraphqlClient;

  afterEach(() => {
    httpMock.verify();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_ENDPOINT, useValue: '/graphql' },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    client = TestBed.inject(GraphqlClient);
  });

  it('returns data on success', () => {
    let result: unknown;
    client.execute('Ping', '{ ping }').subscribe((data) => {
      result = data;
    });
    const req = httpMock.expectOne('/graphql');
    expect(req.request.body).toEqual({
      operationName: 'Ping',
      query: '{ ping }',
      variables: {},
    });
    req.flush({ data: { ping: true } });
    expect(result).toEqual({ ping: true });
  });

  it('rejects GraphQL errors with HTTP 200', () => {
    let err: unknown;
    client.execute('Bad', '{ bad }').subscribe({
      error: (e) => {
        err = e;
      },
    });
    httpMock
      .expectOne('/graphql')
      .flush({ data: null, errors: [{ message: 'boom' }] });
    expect(err).toBeInstanceOf(GraphqlClientError);
    expect((err as GraphqlClientError).kind).toBe('graphql');
  });

  it('parses GraphQL validation errors on HTTP 400', () => {
    let err: unknown;
    client.execute('ListMatchups', 'query').subscribe({ error: (e) => (err = e) });
    httpMock.expectOne('/graphql').flush(
      { errors: [{ message: 'Unknown argument "orderBy"' }] },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(err).toBeInstanceOf(GraphqlClientError);
    expect((err as GraphqlClientError).kind).toBe('graphql');
    expect((err as GraphqlClientError).message).toContain('orderBy');
  });

  it('rejects HTML responses', () => {
    let err: unknown;
    client.execute('Bad', '{ bad }').subscribe({ error: (e) => (err = e) });
    httpMock.expectOne('/graphql').flush('<html>', {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/html' },
    });
    expect((err as GraphqlClientError).kind).toBe('format');
  });
});
