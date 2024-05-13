using LLama.Web.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;

namespace LLama.Web.Pages;

public class IndexModel : PageModel
{
    public IndexModel(IOptions<LLamaOptions> options)
    {
        Options = options.Value;

        SessionConfig = new SessionConfig
        {
            Prompt = "Below is an instruction that describes a task. Write a response that appropriately completes the request.",
            AntiPrompt = "User:",
            OutputFilter = "User:, Assistant:, A:, Response:"
        };

        InferenceOptions = new InferenceOptions
        {
            Temperature = 0.8f
        };
    }

    public LLamaOptions Options { get; set; }

    [BindProperty]
    public ISessionConfig SessionConfig { get; set; }

    [BindProperty]
    public InferenceOptions InferenceOptions { get; set; }

    public void OnGet()
    {
    }
}