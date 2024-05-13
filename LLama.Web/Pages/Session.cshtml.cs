using Microsoft.AspNetCore.Mvc.RazorPages;

namespace LLama.Web.Pages;

public class SessionModel : PageModel
{
    public string ModelName { get; set; }

    public void OnGet(string model)
    {
        ModelName = model;
    }
}