import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, mergeMap, skipWhile, take } from 'rxjs/operators';

class InFlightAggCall<I> {
  constructor(public index: number, public individualRequests: I[]) {}
}

class AggResponseWithIndex<AR, I> {
  constructor(public aggResponse: AR, public index: number, public individualRequests: I[]) {}
}

// I = Individual request type
// AR = Aggregate response type
export class RequestAggregator<I, AR> {
  // Index of the next aggregate call.
  private nextAggCallIndex = 1;

  // Requests for truthStatus currently queued up.
  private queuedRequests = new Set<string>();

  // Aggregate calls in progress.
  private inFlightAggCalls: InFlightAggCall<I>[] = [];

  // Emits whenever an individual request is made.
  private addedToQueue$: Subject<any> = new Subject();

  // Emits index of completed aggregate calls.
  private completedAggCallIndex$: Subject<number> = new Subject();

  constructor(
    parentObject: any,
    private individualRequestComparator: (arg0: I, arg1: I) => boolean,
    private individualRequestToStr: (arg0: I) => string,
    strToIndividualRequest: (arg0: string) => I,
    aggregateCall: (arg0: I[]) => Observable<AR>,
    aggResponseHandler: (arg0: AR, arg1: I[]) => void
  ) {
    this.addedToQueue$
      .pipe(
        debounceTime(50),
        mergeMap((_) => {
          if (this.queuedRequests.size === 0) of(null);
          const newIndex = this.nextAggCallIndex;
          this.nextAggCallIndex++;

          const individualRequests = Array.from(this.queuedRequests).map((ptrString) =>
            strToIndividualRequest(ptrString)
          );
          this.queuedRequests.clear();

          this.inFlightAggCalls.push(new InFlightAggCall(newIndex, individualRequests));
          return aggregateCall.call(parentObject, individualRequests).pipe(
            catchError((err) => {
              console.log('Error fetching aggregate call: ' + err.message);
              console.log(individualRequests);
              return of(null);
            }),
            map(
              (response) =>
                new AggResponseWithIndex<AR, I>(response as AR, newIndex, individualRequests)
            )
          );
        })
      )
      .subscribe((indexWithResponse: AggResponseWithIndex<AR, I>) => {
        if (!indexWithResponse) return;
        this.inFlightAggCalls = this.inFlightAggCalls.filter(
          (inFlightRequest) => inFlightRequest.index != indexWithResponse.index
        );
        aggResponseHandler.call(
          parentObject,
          indexWithResponse.aggResponse,
          indexWithResponse.individualRequests
        );
        this.completedAggCallIndex$.next(indexWithResponse.index);
      });
  }

  public informWhenReady(individualRequests: I[]) {
    let inFlightIndex = this.getInFlightIndex(individualRequests);

    if (!inFlightIndex) {
      this.addIndividualRequests(individualRequests);
      inFlightIndex = this.nextAggCallIndex;
    }

    return this.completedAggCallIndex$.pipe(
      skipWhile((receivedIndex) => receivedIndex !== inFlightIndex),
      take(1)
    );
  }

  private addIndividualRequests(individualRequests: I[]) {
    individualRequests.forEach((individualRequest) =>
      this.queuedRequests.add(this.individualRequestToStr(individualRequest))
    );
    this.addedToQueue$.next('');
  }

  private getInFlightIndex(individualRequests: I[]) {
    // Return existing value only if all the requests are in the same index.
    // If they are in different indices, you can't know when the data will be ready,
    // because aggregate calls may complete in any order.
    for (const inFlightAggCall of this.inFlightAggCalls) {
      const foundAll = individualRequests.every((inputRequest) =>
        inFlightAggCall.individualRequests.some((inFlightRequest) =>
          this.individualRequestComparator(inFlightRequest, inputRequest)
        )
      );

      if (foundAll) return inFlightAggCall.index;
    }
    return null;
  }
}
