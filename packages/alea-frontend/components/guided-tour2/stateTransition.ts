import {
  conceptUriToName,
  getLearningObjects,
  LoType,
  SelfAssessmentEvent,
  updateLearnerModel,
} from '@stex-react/spec';
import assert from 'assert';
import { ActionName } from '../../constants/messages';
import {
  ChatMessage,
  chooseOptionAction,
  GuidedTourState,
  structureLearningObjects,
  systemTextMessage,
  UserAction,
} from '../../pages/guided-tour2/[id]';

function getNextLoType(
  focusConceptLo: Partial<Record<LoType, { uris: string[]; currentIdx: number }>>,
  userAction: UserAction,
  focusConceptCurrentLo?: { type: LoType; uri: string }
) {
  const loOrder: LoType[] = ['definition', 'example', 'para', 'statement', 'problem'];
  const currentLoIdx = focusConceptCurrentLo ? loOrder.indexOf(focusConceptCurrentLo.type) : 0;
  let loTypePreferredIdxOrder: number[];
  if (userAction.chosenOption === 'LO_UNDERSTOOD') {
    loTypePreferredIdxOrder = [];
    for (let i = 1; i <= loOrder.length; i++) {
      loTypePreferredIdxOrder.push((i + currentLoIdx) % loOrder.length);
    }
  } else if (userAction.chosenOption === 'LO_NOT_UNDERSTOOD') {
    loTypePreferredIdxOrder = [
      currentLoIdx,
      ...[0, 1, 2, 3, 4].filter((idx) => idx !== currentLoIdx),
    ];
  } else if (userAction.quotient === 1) {
    loTypePreferredIdxOrder = [4, 3, 2, 1, 0]; // 'problem';
  } else {
    loTypePreferredIdxOrder = [0, 1, 2, 3, 4]; // 'definition';
  }
  for (const typeIdx of loTypePreferredIdxOrder) {
    const type = loOrder[typeIdx];
    const currentIdx = focusConceptLo[type]?.currentIdx;
    const numEntries = focusConceptLo[type]?.uris?.length ?? 0;
    if (numEntries > 0 && currentIdx < numEntries - 1) return type;
  }
  return undefined;
}

function updateNewStateWithNextLo(
  newState: GuidedTourState,
  action: UserAction,
  currentLo?: { type: LoType; uri: string }
): {
  messagesAdded: ChatMessage[];
  actionForNextLo: UserAction;
} {
  const newLoType = getNextLoType(newState.focusConceptLo, action, newState.focusConceptCurrentLo);
  if (!newLoType) {
    const messagesAdded: ChatMessage[] = [];
    if (action.chosenOption === 'LO_NOT_UNDERSTOOD') {
      messagesAdded.push(systemTextMessage('Sorry to hear that!'));
    } else if (action.chosenOption === 'LO_UNDERSTOOD') {
      messagesAdded.push(systemTextMessage('Great!'));
    } else if (action.quotient !== undefined) {
      const topMessage =
        action.quotient === 1
          ? 'Great!'
          : action.quotient === 0
          ? 'Oops! That was incorrect.'
          : "Hmm, that's only partially correct.";
      messagesAdded.push(systemTextMessage(topMessage));
    }
    messagesAdded.push(
      systemTextMessage(
        "No more learning objects available for this concept. Let's move on to the next concept."
      )
    );
    return { messagesAdded, actionForNextLo: chooseOptionAction(['MOVE_ON']) };
  }

  const messagesAdded: ChatMessage[] = [];
  if (currentLo) {
    const article = currentLo.type === newLoType ? 'another' : newLoType === 'example' ? 'an' : 'a';
    if (action.chosenOption === 'LO_UNDERSTOOD') {
      messagesAdded.push(systemTextMessage('Great!'));
      messagesAdded.push(systemTextMessage(`Let's keep learning with ${article} ${newLoType}`));
    } else if (action.chosenOption === 'LO_NOT_UNDERSTOOD') {
      const article =
        currentLo.type === newLoType ? 'another' : newLoType === 'example' ? 'an' : 'a';
      messagesAdded.push(
        systemTextMessage(`No worries! Let's learn more with ${article} ${newLoType}.`)
      );
    } else if (action.quotient !== undefined) {
      const topMessage =
        action.quotient === 1
          ? 'Great!'
          : action.quotient === 0
          ? 'Oops! That was incorrect.'
          : "Hmm, that's only partially correct.";
      messagesAdded.push(systemTextMessage(topMessage));
      messagesAdded.push(systemTextMessage(`Let's keep learning with ${article} ${newLoType}`));
    }
  } else {
    messagesAdded.push(
      systemTextMessage(`Let's start with ${newLoType === 'example' ? 'an' : 'a'} ${newLoType}`)
    );
  }
  newState.focusConceptLo[newLoType].currentIdx++;
  newState.focusConceptCurrentLo = {
    type: newLoType,
    uri: newState.focusConceptLo[newLoType].uris[newState.focusConceptLo[newLoType].currentIdx],
  };
  messagesAdded.push({
    from: 'system',
    type: newLoType,
    loUri: newState.focusConceptCurrentLo.uri,
  });
  let actionForNextLo: UserAction;
  if (newLoType === 'problem') {
    actionForNextLo = { actionType: 'problem' };
  } else {
    messagesAdded.push(systemTextMessage(`Were you able to understand the above ${newLoType}?`));
    actionForNextLo = chooseOptionAction(['LO_UNDERSTOOD', 'LO_NOT_UNDERSTOOD']);
  }
  return { messagesAdded, actionForNextLo };
}

async function moveOnAction(
  state: GuidedTourState,
  nextIndex: number,
  currentConceptUri: string
): Promise<{
  newState: GuidedTourState;
  newMessages: ChatMessage[];
  nextAction: UserAction;
}> {
  const newState = { ...state };
  if (nextIndex === -1) {
    const newMessages = [
      systemTextMessage(
        '<b style="color:#8e24aa"> Well Done! You have reached the end of Guided Tour.</b>'
      ),
    ];
    const nextAction = { actionType: 'end' } as UserAction;
    return { newState, nextAction, newMessages };
  }

  newState.completedConceptUris.push(currentConceptUri);
  const updatePayload: SelfAssessmentEvent = {
    type: 'self-assessment',
    concept: currentConceptUri,
    competences: { Remember: 1.0, Understand: 1.0, Apply: 1.0 },
    time: new Date().toISOString(),
    payload: '',
    comment: 'Self assessment through guided tour',
  };
  await updateLearnerModel(updatePayload);

  if (currentConceptUri === newState.targetConceptUri) {
    const newMessages = [
      systemTextMessage(
        '<b style="color:#8e24aa"> Well Done! You have reached the end of Guided Tour.</b>'
      ),
    ];
    const nextAction = { actionType: 'end' } as UserAction;
    return { newState, nextAction, newMessages };
  }
  return await startNewConcept(newState, nextIndex, true);
}

async function startNewConcept(
  newState: GuidedTourState,
  nextIndex: number,
  needsInitialization: boolean
) {
  newState.focusConceptIdx = nextIndex;
  const nextConceptUri = newState.leafConceptUris[nextIndex];
  const nextConceptName = conceptUriToName(nextConceptUri);
  const response = await getLearningObjects([nextConceptUri]);
  const result = await structureLearningObjects(response['learning-objects']);
  newState.focusConceptLo = result;

  newState.focusConceptInitialized = !needsInitialization;
  if (needsInitialization) {
    const newMessages = [
      systemTextMessage(
        `Alright, let's proceed!</br>Do you feel confident about your understanding of <b style="color: #d629ce">${nextConceptName}</b>.`
      ),
    ];

    const options: ActionName[] = ['KNOW', 'DONT_KNOW'];
    if (newState.focusConceptLo['problem']?.uris?.length > 0) {
      options.push('NOT_SURE_IF_KNOW');
    }
    return { newState, newMessages, nextAction: chooseOptionAction(options) };
  } else {
    const newMessages = [
      systemTextMessage(`Let's study <b style="color: #d629ce">${nextConceptName}</b>.`),
    ];
    const { messagesAdded, actionForNextLo } = updateNewStateWithNextLo(newState, {
      actionType: 'out-of-conversation',
    });
    newMessages.push(...messagesAdded);
    return { newState, newMessages, nextAction: actionForNextLo };
  }
}

async function dontMoveOnAction(
  state: GuidedTourState,
  action: UserAction,
  currentConceptName: string
): Promise<{
  newState: GuidedTourState;
  newMessages: ChatMessage[];
  nextAction: UserAction;
}> {
  const newState = { ...state };
  const newMessages: ChatMessage[] = [];
  let nextAction: UserAction = undefined;

  newMessages.push(
    systemTextMessage(
      `Alright, let's study more about <b style="color: #d629ce">${currentConceptName}</b>.`
    )
  );

  const newLoType = getNextLoType(newState.focusConceptLo, action, newState.focusConceptCurrentLo);
  if (newLoType) {
    newState.focusConceptCurrentLo = {
      type: newLoType,
      uri: newState.focusConceptLo[newLoType][newState.focusConceptLo[newLoType].currentIdx],
    };
    newState.focusConceptInitialized = true;
    const { messagesAdded, actionForNextLo } = updateNewStateWithNextLo(
      newState,
      action,
      state.focusConceptCurrentLo
    );
    newMessages.push(...messagesAdded);
    nextAction = actionForNextLo;
  } else {
    newMessages.push(systemTextMessage('No more learning objects available for this concept.'));
    nextAction = chooseOptionAction(['MOVE_ON']);
  }

  return { newState, newMessages, nextAction };
}

function handleKnownConceptAction(
  state: GuidedTourState,
  currentConceptUri: string,
  nextConceptName: string
): {
  newState: GuidedTourState;
  newMessages: ChatMessage[];
  nextAction: UserAction;
} {
  const newState = { ...state };
  const newMessages: ChatMessage[] = [];
  let nextAction: UserAction = undefined;

  const nextIndex = findNextAvailableIndex(
    newState.focusConceptIdx,
    newState.leafConceptUris,
    newState.completedConceptUris
  );
  if (
    nextIndex === -1 ||
    newState.leafConceptUris.length - newState.completedConceptUris.length === 1
  ) {
    newState.completedConceptUris.push(currentConceptUri);
    newMessages.push(
      systemTextMessage(
        '<b style="color:#8e24aa"> Well Done! You have reached the end of Guided Tour.</b>'
      )
    );
    nextAction = { actionType: 'end' };
    return { newState, newMessages, nextAction };
  }

  newMessages.push(
    systemTextMessage(
      `Great!</br>Let's move on to the next concept -  <b style="color: #d629ce">${nextConceptName}</b>.`
    )
  );

  nextAction = chooseOptionAction(['MOVE_ON', 'DONT_MOVE_ON']);

  return { newState, newMessages, nextAction };
}
async function handleDontKnow(
  newState: GuidedTourState,
  currentConceptUri: string,
  currentConceptName: string,
  action: UserAction,
  newMessages: ChatMessage[]
): Promise<{ newState: GuidedTourState; newMessages: ChatMessage[]; nextAction: UserAction }> {
  newMessages.push(
    systemTextMessage(`Alright! Let's study <b style="color: #d629ce">${currentConceptName}</b>.`)
  );
  newState.focusConceptInitialized = true;
  const { messagesAdded, actionForNextLo } = updateNewStateWithNextLo(newState, action);
  newMessages.push(...messagesAdded);
  return { newState, newMessages, nextAction: actionForNextLo };
}

async function handleNotSureIfKnowOption(
  newState: GuidedTourState,
  currentConceptName: string,
  newMessages: ChatMessage[]
): Promise<{ newState: GuidedTourState; newMessages: ChatMessage[]; nextAction: UserAction }> {
  newMessages.push(
    systemTextMessage(
      `No worries, let's check your understanding of  <b style="color: #d629ce">${currentConceptName}</b> with a problem.`
    )
  );
  newState.focusConceptLo.problem.currentIdx++;
  newMessages.push({
    from: 'system',
    type: 'problem',
    loUri: newState.focusConceptLo.problem.uris[newState.focusConceptLo.problem.currentIdx],
  });
  return { newState, newMessages, nextAction: { actionType: 'problem' } };
}
async function handleAnotherProblemOption(
  newState: GuidedTourState,
  newMessages: ChatMessage[]
): Promise<{ newState: GuidedTourState; newMessages: ChatMessage[]; nextAction: UserAction }> {
  newState.focusConceptLo.problem.currentIdx++;
  newMessages.push({
    from: 'system',
    type: 'problem',
    loUri: newState.focusConceptLo.problem.uris[newState.focusConceptLo.problem.currentIdx],
  });
  return { newState, newMessages, nextAction: { actionType: 'problem' } };
}
async function handleProblemAction(
  action: UserAction,
  newState: GuidedTourState,
  newMessages: ChatMessage[]
): Promise<{ newState: GuidedTourState; newMessages: ChatMessage[]; nextAction: UserAction }> {
  assert(action.actionType === 'problem', JSON.stringify(action));
  assert(action.quotient !== undefined);
  if (action.quotient === 1) {
    newMessages.push(systemTextMessage('Correct!'));
    newMessages.push(systemTextMessage('Do you feel confident in your understanding to move on?'));
    const numProblems = newState.focusConceptLo.problem?.uris?.length ?? 0;
    const idx = newState.focusConceptLo.problem?.currentIdx ?? -1;
    const options: ActionName[] = ['MOVE_ON'];
    if (numProblems > 0 && idx < numProblems - 1) {
      newState.focusConceptLo.problem.currentIdx++;
      options.push('ANOTHER_PROBLEM');
    } else {
      options.push('DONT_MOVE_ON');
    }
    return { newState, newMessages, nextAction: chooseOptionAction(options) };
  } else {
    const topMessage =
      action.quotient === 0 ? 'Oops! That was incorrect.' : "Hmm, that's only partially correct.";
    newMessages.push(systemTextMessage(topMessage));
    newMessages.push(systemTextMessage('Do you want to try another problem?'));
    return {
      newState,
      newMessages,
      nextAction: chooseOptionAction(['ANOTHER_PROBLEM', 'DONT_KNOW', 'MOVE_ON']),
    };
  }
}
const findNextAvailableIndex = (
  currentIndex: number,
  leafConceptUris: string[],
  completedConceptUris: string[]
): number => {
  const completedSet = new Set(completedConceptUris);
  for (let i = 0; i < leafConceptUris.length; i++) {
    const idx = (currentIndex + i) % leafConceptUris.length;
    if (!completedSet.has(leafConceptUris[idx])) return idx;
  }
  return -1;
};

export async function stateTransition(
  state: GuidedTourState,
  action: UserAction
): Promise<{ newState: GuidedTourState; newMessages: ChatMessage[]; nextAction: UserAction }> {
  const newState = { ...state };
  const newMessages: ChatMessage[] = [];
  let nextAction: UserAction = undefined;
  const currentConceptUri = state.leafConceptUris[state.focusConceptIdx];
  const nextIndex = findNextAvailableIndex(
    newState.focusConceptIdx,
    newState.leafConceptUris,
    newState.completedConceptUris
  );
  const nextConceptUri = newState.leafConceptUris[nextIndex];
  const currentConceptName = conceptUriToName(currentConceptUri);
  const nextConceptName = conceptUriToName(nextConceptUri);

  if (action.chosenOption === 'MARK_AS_KNOWN') {
    assert(action.targetConceptUri);
    if (action.targetConceptUri === currentConceptUri) {
      return await moveOnAction( newState, nextIndex, currentConceptUri);
    } else {
      if (!newState.completedConceptUris.includes(action.targetConceptUri))
        newState.completedConceptUris.push(action.targetConceptUri);
      return { newState, newMessages: [], nextAction /*bug*/ };
    }
  } else if (action.chosenOption === 'REVISIT') {
    assert(action.targetConceptUri);
    const index = newState.leafConceptUris.indexOf(action.targetConceptUri);
    newState.completedConceptUris = newState.completedConceptUris.filter(
      (completedUri) => completedUri !== action.targetConceptUri
    );
    return startNewConcept(newState, index, false);
  } else if (action.chosenOption === 'NAVIGATE') {
    assert(action.targetConceptUri);
    const index = newState.leafConceptUris.indexOf(action.targetConceptUri);
    return startNewConcept(newState, index, false);
  } else if (action.chosenOption === 'MOVE_ON') {
    return moveOnAction(newState, nextIndex, currentConceptUri);
  } else if (action.chosenOption === 'DONT_MOVE_ON') {
    return dontMoveOnAction(newState, action, currentConceptName);
  } else if (!state.focusConceptInitialized) {
    if (action.chosenOption === 'KNOW') {
      return handleKnownConceptAction(newState, currentConceptUri, nextConceptName);
    } else if (action.chosenOption === 'DONT_KNOW') {
      return handleDontKnow(newState, currentConceptUri, currentConceptName, action, newMessages);
    } else if (action.chosenOption === 'NOT_SURE_IF_KNOW') {
      return handleNotSureIfKnowOption(newState, currentConceptName, newMessages);
    } else if (action.chosenOption === 'ANOTHER_PROBLEM') {
      return handleAnotherProblemOption(newState, newMessages);
    } else {
      return handleProblemAction(action, newState, newMessages);
    }
  } else {
    /* focusConceptInitialized */
    if (action.quotient === 1) {
      newMessages.push(systemTextMessage('Correct!'));
      newMessages.push(
        systemTextMessage('Do you feel confident in your understanding to move on?')
      );
      nextAction = chooseOptionAction(['MOVE_ON', 'DONT_MOVE_ON']);
    } else {
      newState.focusConceptInitialized = true;
      const { messagesAdded, actionForNextLo } = updateNewStateWithNextLo(
        newState,
        action,
        state.focusConceptCurrentLo
      );
      newMessages.push(...messagesAdded);
      nextAction = actionForNextLo;
    }
  }
  assert(!!nextAction);
  return { newState, nextAction, newMessages };
}
