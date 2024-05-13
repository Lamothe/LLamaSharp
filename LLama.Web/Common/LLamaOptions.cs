namespace LLama.Web.Common;

public class LLamaOptions
{
    public ModelLoadType ModelLoadType { get; set; }

    public IEnumerable<ModelOptions> Models { get; set; }
}
