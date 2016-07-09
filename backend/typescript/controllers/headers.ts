export class Headers {

    public static Prefix = `X-RAM`;

    public static AuthToken = `${Headers.Prefix}-Auth-Token`;
    public static AuthTokenDecoded = `${Headers.Prefix}-Auth-Token-Decoded`;

    public static Identity = `${Headers.Prefix}-Identity`;
    public static IdentityIdValue = `${Headers.Prefix}-Identity-IdValue`;
    public static IdentityRawIdValue = `${Headers.Prefix}-Identity-RawIdValue`;
    public static IdentityType = `${Headers.Prefix}-IdentityType`;

    //LM: I'm not sure we need to know the party type (I presume this is individual, busines, device).  Do we just need to know the identitifer type?
    public static PartyType = `${Headers.Prefix}-PartyType`;

    public static GivenName = `${Headers.Prefix}-GivenName`;
    public static FamilyName = `${Headers.Prefix}-FamilyName`;
    public static UnstructuredName = `${Headers.Prefix}-UnstructuredName`;
    public static DOB = `${Headers.Prefix}-DOB`;

    public static ProfileProvider = `${Headers.Prefix}-ProfileProvider`;

    public static AgencyScheme = `${Headers.Prefix}-AgencyScheme`;
    public static AgencyToken = `${Headers.Prefix}-AgencyToken`;
    public static LinkIdScheme = `${Headers.Prefix}-LinkIdScheme`;
    public static LinkIdConsumer = `${Headers.Prefix}-LinkIdConsumer`;
    public static PublicIdentifierScheme = `${Headers.Prefix}-PublicIdentifierScheme`;

}