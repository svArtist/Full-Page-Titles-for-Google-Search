# Full Page Titles for Google Search
Annoyed by too long page titles getting cut off by Google? Me too.
___

Alright... I know there has to be a <i>limit for link texts</i>. I get it.
That doesn't mean I have to like or even accept it.

I've always wondered why they don't include a longer version of the title in the link titles (<i>"&lt;a href='URI'&gt;Too long t...&lt;/a&gt;</i>" --&gt; "<i>&lt;a href='URI' title='Too long title'&gt;Too long t...&lt;/a&gt;</i>").

They could leave the actual link text short, and provide at least a title that's a bit longer for mouse overs.

I wrote a script that does the leg work for you there.

This script goes through all the links, looking for new links ending with "...".

<b>It gets the target page for each match in the background and takes the title and puts it in the search result link as a Link Title.</b>

<b>Limitations:</b>
<ul>
<li>When you request a .pdf file, it will open as a download. Because of that, I'm excluding URIs that end in ".pdf" from being followed up.</li>
<li>I couldn't find an effective way of really only getting the page &lt;head&gt;, I'm getting the whole document. This means there is a bit of traffic happening in the background while the pages are being checked. You might not want to use it if you are super low on data volume.</li></ul>

<b>Update v1.2 2017-02-15</b>
<ul>
<li>Unescaped HTML in page titles. No more ugly quotes, brackets, ampersands, etc</li>
<li>Changed include match to exclude google image search</li>
</ul>

<b>Update v1.3 2017-02-15</b>
<ul>
<li>Added option to write the Title to the link's innerHTML</li>
<li>Added logging/verbosity levels</li>
</ul>
