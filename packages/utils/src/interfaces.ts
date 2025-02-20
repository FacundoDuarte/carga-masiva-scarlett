export interface ValidationResponse {
  app: {
    id: string;
    version: string;
    installationId: string;
    apiBaseUrl: string;
    environment: {
      type: string;
      id: string;
    };
    module: {
      type: string;
      key: string;
    };
    license: {
      isActive: boolean;
      billingPeriod: string;
      ccpEntitlementId: string;
      ccpEntitlementSlug: string;
      isEvaluation: boolean;
      subscriptionEndDate: string;
      supportEntitlementNumber: string;
      trialEndDate: string;
      type: string;
    };
  };
  context: {
    localId: string;
    cloudId: string;
    moduleKey: string;
    siteUrl: string;
    extension: {
      type: string;
      content: {
        id: string;
      };
      space: {
        key: string;
        id: string;
      };
      isEditing: boolean;
      references: any[];
    };
  };
  principal: string;
  aud: string;
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
  jti: string;
}
