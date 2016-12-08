namespace Template.Tango
{
    public class WgSurfNav
    {
        public string Uid { get; set; }
        public string WG { get; set; }
        public string Mods { get; set; }
        public WgSurfNav_Items[] Items { get; set; }
    }

    public class WgSurfNav_Items
    {
        public string Title { get; set; }
        public string Href { get; set; }
        public bool Active { get; set; }
    }
}