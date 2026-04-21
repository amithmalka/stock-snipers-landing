export type RootTabParamList = {
  CalendarTab: undefined;
  AskExpertTab: undefined;
  MikvehTab: undefined;
  ServicesTab: undefined;
  ProfileTab: undefined;
};

export type CalendarStackParamList = {
  Calendar: undefined;
  CycleEntry: undefined;
};

export type AskExpertStackParamList = {
  AskExpert: undefined;
  Chat: { rabbiId: string };
};

export type ServicesStackParamList = {
  Services: undefined;
  ProviderDetail: { providerId: string };
};

export type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
};
