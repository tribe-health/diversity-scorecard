[Back to blog](https://pinata.cloud/blog/)

  ![How to Create a Public Database With PGLite](/blog/content/images/size/w1200/2024/10/How-to-Create-a-Public-Database-With-PGLite.png)

How to Create a Public Database With PGLite
===========================================

![Steve](https://pinata.cloud/blog/content/images/2024/06/headshot_square.jpeg)

[Steve](/blog/author/steve/)

September 17, 2024

Databases are a crucial piece of the web as we know it today, and some might say that’s all the internet is! With that high demand comes new database models and implementations, and one that has struck a lot of interest is [PGlite](https://pglite.dev/?ref=pinata.cloud)
. This new implementation uses WASM to allow full postgres databases to be run locally in the browser or in a server, making them lightweight, extendable, and reactive. The possibilities of this are endless, but one interesting idea we had is making a public sharable database.

This idea evolved into an app we built called [bookshelf.studio](http://bookshelf.studio/?ref=pinata.cloud)
 which lets you create a bookshelf, add books to it, and then share it with others. The interesting catch is that every shelf is its own database, and each version of the database is stored in a file group using Pinata. What you get in the end is an app that creates many small databases which all have their own versioning you could tap into, if you wanted to. Of course, you could simplify this model and just have two tables hosted on a server, but it’s fun to experiment with PGlite’s portability. We’ll help you explore this concept as we show you how to build Bookshelf!

Setup
-----

As we mentioned briefly, we are going to use Pinata to backup and essentially create a state machine for all our databases. Getting started with Pinata is simple, just visit [`app.pinata.cloud`](http://app.pinata.cloud/?ref=pinata.cloud)
 to create a free account within just a few minutes. Then you’ll want to make an API key, which you can do by clicking on the “API Keys” tab on the left side bar, then clicking “New Key” in the top right. It will give you several options, but for now give it admin access with unlimited uses. Once it’s created you’ll want to copy down all the keys as these are only shown once; we’ll primarily be using the `JWT` which is a bit longer. After you have your key we’ll also need the Gateway domain which is included with your account; just click on the Gateways tab on the left and then copy the domain as you see it. The Gateway domain should look something like `example-llama.mypinata.cloud`.

With our Pinata account all setup, we can move onto firing up our app. For this one, we’ll use Next.js to create a serverless app, but as you scale it might make more sense to move this to something more lightweight like an [API server in Deno](https://pinata.cloud/blog/how-to-build-a-persistent-crud-app-using-sqlite-and-deno-js/)
 with a [Svelte frontend](https://pinata.cloud/blog/how-to-upload-files-with-sveltekit-and-pinata/)
. To start, you’ll want to make sure you have Node.js installed (preferably v.20 or higher) as well as a good text editor. From there, open up your terminal and run:

    npx create-next-app@latest bookshelf
    

Select all the default options provided and it will install and setup our primary app. Once complete, we’ll `cd` into the repo and install a few more things.

    cd bookshelf && npm i pinata @electric-sql/pglite drizzle-orm && npm i -D drizzle-kit
    

This will install the Pinata SDK, PGlite, and Drizzle to make interacting with the database a bit more user friendly. Finally, let’s install a component library so that we don’t have to spend all day writing CSS to make this thing presentable, and nothing beats the simplicity of shadcn/ui.

    npx shadcn@latest init && npx shadcn@latest add button card dialog form input 
    

All our installations are done, now let’s initialize some of them. You should see a folder called `lib`, and inside let’s make a file called `pinata.ts` with the following contents:

    import { PinataSDK } from "pinata";
    
    export const pinata = new PinataSDK({
    	pinataJwt: process.env.PINATA_JWT,
    	pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL,
    });
    

This will export an instance of the Pinata SDK that we can use throughout the app using some environment variables, but we need to set those up. Make a new file in the root of the project called `.env.local` with these variables:

    PINATA_JWT= # The Pinata JWT API key we got earlier
    GATEWAY_URL= # The Gateway domain we grabbed earlier, formatting just as we copied it from the app
    

We have one more thing to setup, and that’s some database helpers. Make a new file called `db.ts` in the `lib` folder once more, and put this code inside.

    import { pinata } from "./pinata";
    import { PGlite } from "@electric-sql/pglite";
    import { pgTable, serial, text } from "drizzle-orm/pg-core";
    
    export const bookshelf = pgTable("bookshelf", {
    	id: serial("id").primaryKey(),
    	title: text("title").notNull(),
    	author: text("author"),
    	image_url: text("image_url"),
    });
    
    export async function createDb(name: string): Promise<string | unknown> {
    	const db = new PGlite();
    	try {
    		const group = await pinata.groups.create({
    			name: name,
    			isPublic: true,
    		});
    
    		await db.exec(`
    		    CREATE TABLE IF NOT EXISTS bookshelf (
    		      id SERIAL PRIMARY KEY,
    		      title TEXT,
    		      author TEXT,
    					image_url TEXT
    		    );
    		  `);
    
    		const file = (await db.dumpDataDir("auto")) as File;
    		const upload = await pinata.upload
    			.file(file)
    			.group(group.id)
    			.addMetadata({ name: name });
    		console.log(upload);
    		return group.id;
    	} catch (error) {
    		console.log(error);
    		return error;
    	}
    }
    
    export async function restoreSnapshot(
    	groupId: string,
    ): Promise<PGlite | undefined> {
    	try {
    		const files = await pinata.files.list().group(groupId).order("DESC");
    		const dbFile = await pinata.gateways.get(files.files[0].cid);
    		const file = dbFile.data as Blob;
    		const client: PGlite = new PGlite({ loadDataDir: file });
    		return client;
    	} catch (error) {
    		console.log(error);
    		return;
    	}
    }
    
    

This might look a little scary, but it’s actually pretty straight forward. First, we import some of the database dependencies including PGlite and Drizzle, as well as Pinata since we’ll need it for the backups. Next, we’ll make a `pgTable` called `bookshelf` which works as a type system for Drizzle, so we’ll get nice completions when making queries or insertions.

The first function we export is `createDb` which takes in a name, and then it does a few things for us. Like we mentioned earlier, we’re going to make a database for each shelf, and to help organize and manage versioning, we’ll use [Pinata groups](https://docs.pinata.cloud/files/file-groups?ref=pinata.cloud)
. These are file groups that you can upload files to, query, and sort through which will come in handy. Our function here will create a group based on the name passed in, and then we’ll use PGLite to make a new database following the schematic of our `bookshelf` from earlier. Once created, we’ll immediately dump it as a file which we then upload into our freshly created group. Once all of that is done, we’ll return the group ID which will act as our index.

Next, we have `restoreSnapshot` which will list all the files of the `groupId` passed in and order them from newest to oldest. Then, it will select the latest file and download it using `pinata.gateways.get`, and with the downloaded file create an instance of PGLite which we return to the user. We’ll be using some more database magic, but this helps reduce some of the repeated code we otherwise would need to use.

We have one last file to setup and that’s the `next.config.mjs` file located in the root of the project. Open it up and put this code in:

    /** @type {import('next').NextConfig} */
    const nextConfig = {
    	experimental: {
    		serverComponentsExternalPackages: ["@electric-sql/pglite"],
    	},
    	images: {
    		remotePatterns: [\
    			{\
    				protocol: "https",\
    				hostname: "**",\
    			},\
    			{\
    				protocol: "http",\
    				hostname: "**",\
    			},\
    		],
    	},
    };
    
    export default nextConfig;
    

It took me a while to figure out why the [suggested config from PGLite](https://pglite.dev/docs/bundler-support?ref=pinata.cloud#next-js)
 wasn’t working but I eventually found it due to it needing to be part of an experimental feature called `serverComponentExternalPackages`. Adding this made it work like a charm! We also add in some remote patterns for images, which we’ll see in action soon!

Listing and Creating Shelves
----------------------------

With some of backbone of the project setup we can now build out the app itself. We’ll be making a primary page that will list all current bookshelves that a user can click on to view. To do this, we’ll clear out the boilerplate in `app/page.tsx` and put in the following code.

    export const revalidate = 0;
    
    import { pinata } from "@/lib/pinata";
    import type { GroupResponseItem } from "pinata";
    import { CreateShelfForm } from "@/components/create-shelf-form";
    import Link from "next/link";
    
    async function fetchData() {
    	try {
    		const groups = await pinata.groups.list();
    		console.log(groups);
    		if (groups.groups === null) {
    			return [];
    		}
    		return groups.groups;
    	} catch (error) {
    		console.log(error);
    		return [];
    	}
    }
    
    export default async function Home() {
    	const groups = await fetchData();
    	return (
    		<div className="min-h-screen mx-auto">
    			<div className="flex flex-col gap-12 mt-12 items-center justify-start mx-auto font-[family-name:var(--font-geist-sans)] border-4 border-black rounded-md max-w-[375px] sm:max-w-[500px] py-12">
    				<div className="flex flex-col justify-center items-center">
    					<h1 className="font-[family-name:var(--font-merriweather)] scroll-m-20 font-extrabold tracking-tight text-5xl underline">
    						Bookshelf
    					</h1>
    					<h3 className="scroll-m-20 sm:text-2xl text-xl px-2 font-semibold tracking-tight">
    						Create and share your favorite books
    					</h3>
    				</div>
    				<div className="flex flex-col gap-4 mt-12">
    					{groups.length === 0 && <h1>No Shelves yet!</h1>}
    					{groups.map((group: GroupResponseItem) => (
    						<Link href={`/shelf/${group.id}`}>
    							<div className="p-4 w-full rounded-lg hover:text-gray-500 transition-colors">
    								<h1 className="text-2xl font-semibold underline underline-offset-[12px]">
    									{group.name}
    								</h1>
    							</div>
    						</Link>
    					))}
    				</div>
    				<CreateShelfForm />
    			</div>
    		</div>
    	);
    }
    

Here we have a pretty clean server rendered page where we have a function to fetch all our groups and return them as an array. That function (`fetchData()`) is called inside the `Home` page and then the data is mapped to some JSX to display. However, right now, we don’t have any bookshelves, so we need a component to help create them. Let’s make that one now by creating a file under the `components` folder called `create-shelf-form.tsx` .

    "use client";
    
    import { z } from "zod";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { useForm } from "react-hook-form";
    import { Button } from "@/components/ui/button";
    import {
    	Form,
    	FormControl,
    	FormDescription,
    	FormField,
    	FormItem,
    	FormLabel,
    	FormMessage,
    } from "@/components/ui/form";
    import { Input } from "@/components/ui/input";
    import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
    import { useRouter } from "next/navigation";
    import { useState } from "react";
    import { ReloadIcon } from "@radix-ui/react-icons";
    
    const formSchema = z.object({
    	title: z.string().min(2).max(25),
    });
    
    export function CreateShelfForm() {
    	const [isLoading, setIsLoading] = useState(false);
    	const router = useRouter();
    	const form = useForm<z.infer<typeof formSchema>>({
    		resolver: zodResolver(formSchema),
    		defaultValues: {
    			title: "",
    		},
    	});
    	async function onSubmit(values: z.infer<typeof formSchema>) {
    		setIsLoading(true);
    		try {
    			const req = await fetch("/api/shelf", {
    				method: "POST",
    				headers: {
    					"Content-Type": "application/json",
    				},
    				body: JSON.stringify({
    					name: values.title,
    				}),
    			});
    			const res = await req.json();
    			router.push(`/shelf/${res.id}`);
    			setIsLoading(false);
    		} catch (error) {
    			console.log(error);
    			setIsLoading(false);
    			return error;
    		}
    	}
    	return (
    		<Dialog>
    			<DialogTrigger>
    				<Button asChild>
    					<p> Create Shelf</p>
    				</Button>
    			</DialogTrigger>
    			<DialogContent>
    				<Form {...form}>
    					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
    						<FormField
    							control={form.control}
    							name="title"
    							render={({ field }) => (
    								<FormItem>
    									<FormLabel>Name</FormLabel>
    									<FormControl>
    										<Input placeholder="Classics" {...field} />
    									</FormControl>
    									<FormDescription>
    										The name you want to give your bookshelf
    									</FormDescription>
    									<FormMessage />
    								</FormItem>
    							)}
    						/>
    						{isLoading ? (
    							<Button disabled>
    								<ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
    								Creating your shelf...
    							</Button>
    						) : (
    							<Button type="submit">Create</Button>
    						)}
    					</form>
    				</Form>
    			</DialogContent>
    		</Dialog>
    	);
    }
    

This file is a bit lengthy due to all the UI elements, but it does create a nice effect. When the user clicks on the “Create Shelf” button it will trigger a modal that has a form. The user can type in a name and submit it. Behind the scenes, we’ll take that form input and use it as an API request to `/api/shelf`, then using the resulting `id` returned we’ll redirect the user to a new page. We haven’t build the API endpoint yet, so let’s do that now by creating a folder inside `app` called `api`, then yet another folder inside of `api` called `shelf`. Finally, create a file inside of the `shelf` folder called `route.ts` with the following contents:

    import type { NextRequest } from "next/server";
    import { NextResponse } from "next/server";
    import { createDb } from "@/lib/db";
    
    export async function POST(request: NextRequest) {
    	const data = await request.json();
    	try {
    		const groupId = await createDb(data.name);
    		return NextResponse.json({ id: groupId }, { status: 200 });
    	} catch (error) {
    		console.log(error);
    		return NextResponse.json(
    			{ error: "Internal Server Error" },
    			{ status: 500 },
    		);
    	}
    }
    

The API endpoint is truly simple; parse the incoming JSON, which would be the name our user selected, then pass that into the `createDb` function we made in `lib/db.ts` a while back. If you remember, that function will:

*   Create a group with the selected name
*   Create a database table
*   Upload the database to the group
*   Return the group ID

Then, we simply pass that group ID back to the client so that they can get redirected to that shelf page.

Expanding Shelves and Adding Books
----------------------------------

With our last component that creates a shelf, we redirect the user to `/shelf/{id}`, a dynamic path which we’ll create now! Make a new folder inside of `app` called `shelf` , then make another folder inside of that one called `[group_id]`, which will parse anything we put into it. Then, make a file called `page.tsx` inside that folder and put the following code inside.

    export const revalidate = 0;
    
    import { pinata } from "@/lib/pinata";
    import { drizzle } from "drizzle-orm/pglite";
    import Link from "next/link";
    import Image from "next/image";
    import { AddBook } from "@/components/add-book-search";
    import { Button } from "@/components/ui/button";
    import { restoreSnapshot, bookshelf } from "@/lib/db";
    import { ShareButton } from "@/components/share-button";
    
    type Book = {
    	id: number;
    	title: string;
    	author: string | null;
    	image_url: string | null;
    };
    
    async function fetchData(groupId: string): Promise<Book[]> {
    	try {
    		const client = await restoreSnapshot(groupId);
    		if (client) {
    			const db = drizzle(client);
    			const books: Book[] = await db.select().from(bookshelf);
    			console.log(books);
    			return books;
    		}
    		return [];
    	} catch (error) {
    		console.log(error);
    		return [];
    	}
    }
    export default async function Page({
    	params,
    }: { params: { group_id: string } }) {
    	const books = await fetchData(params.group_id);
    	const { name } = await pinata.groups.get({ groupId: params.group_id });
    	console.log(books);
    
    	return (
    		<div className="min-h-screen mx-auto">
    			<div className="flex flex-col mx-auto gap-12 items-center justify-start border-4 border-black my-12 sm:max-w-screen-lg max-w-[375px] p-4 font-[family-name:var(--font-geist-sans)]">
    				<h2 className="scroll-m-20 font-[family-name:var(--font-merriweather)] text-4xl font-semibold tracking-tight mt-2 underline">
    					{name}
    				</h2>
    				<div className="flex gap-4">
    					<Button asChild>
    						<Link href="/">Go Back</Link>
    					</Button>
    					<AddBook groupId={params.group_id} />
    					<ShareButton id={params.group_id} />
    				</div>
    				{books.length === 0 && (
    					<h3 className="text-center">No books yet, add one now!</h3>
    				)}
    				<div className="grid sm:grid-cols-4 grid-cols-2 gap-4 mt-12 flex-wrap mx-auto">
    					{books.map((book: Book) => (
    						<div className="p-4 max-w-48" key={book.id}>
    							<Image
    								alt={book.title}
    								src={book.image_url || ""}
    								width={150}
    								height={100}
    							/>
    							<h4 className="scroll-m-20 text-lg font-semibold tracking-tight">
    								{book.title}
    							</h4>
    							<p className="truncate">{book.author}</p>
    						</div>
    					))}
    				</div>
    			</div>
    		</div>
    	);
    }
    
    

This page will be similar to our home page where we have a `fetchData` function, which then renders content to our page, but this time we’ll be fetching the database. If you look closely, you’ll see the `restoreSnapshot` function we created in `lib/db.ts` earlier. This takes in the `groupId` and uses it to get the latest version of our database, then returns it as a `client`. We can then pass this `client` into `drizzle` and select all our books and map them into the page. The only problem is that, once again, we don’t have any books! Let’s make a new component called `add-book-search.tsx` .

    "use client";
    
    import React, { useState, useEffect } from "react";
    import { useRouter } from "next/navigation";
    import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
    import { Button } from "./ui/button";
    import { Input } from "./ui/input";
    import { ReloadIcon } from "@radix-ui/react-icons";
    
    interface Book {
    	id: string;
    	volumeInfo: {
    		title: string;
    		authors?: string[];
    		description?: string;
    		publishedDate?: string;
    		imageLinks?: {
    			thumbnail?: string;
    		};
    	};
    }
    
    export function AddBook({ groupId }: { groupId: string }) {
    	const [query, setQuery] = useState("");
    	const [books, setBooks] = useState<Book[]>([]);
    	const [open, setOpen] = useState(false);
    	const [loading, setLoading] = useState(false);
    	const [loadingBook, setLoadingBook] = useState(false);
    	const router = useRouter();
    
    	useEffect(() => {
    		const fetchBooks = async () => {
    			if (query.trim() === "") {
    				setBooks([]);
    				return;
    			}
    
    			setLoading(true);
    			try {
    				const response = await fetch(
    					`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    						query,
    					)}&maxResults=5`,
    				);
    				const data = await response.json();
    				setBooks(data.items || []);
    			} catch (error) {
    				console.error("Error fetching books:", error);
    				setBooks([]);
    			} finally {
    				setLoading(false);
    			}
    		};
    
    		const debounceTimer = setTimeout(fetchBooks, 300);
    
    		return () => clearTimeout(debounceTimer);
    	}, [query]);
    
    	async function addBook(book: Book) {
    		setLoadingBook(true);
    		try {
    			const data = JSON.stringify({
    				title: book.volumeInfo.title,
    				author: book.volumeInfo.authors?.[0],
    				image_url: book.volumeInfo.imageLinks?.thumbnail,
    				groupId: groupId,
    			});
    
    			const req = await fetch("/api/book", {
    				method: "POST",
    				headers: {
    					"Content-Type": "application/json",
    				},
    				body: data,
    			});
    			const res = await req.json();
    			console.log(res);
    			setOpen(false);
    			setQuery("");
    			setLoadingBook(false);
    			router.refresh();
    		} catch (error) {
    			setLoadingBook(false);
    			console.log(error);
    		}
    	}
    
    	return (
    		<Dialog open={open} onOpenChange={setOpen}>
    			<DialogTrigger>
    				<Button asChild>
    					<p>Add Book</p>
    				</Button>
    			</DialogTrigger>
    			<DialogContent className="max-w-[375px] sm:max-w-[500px]">
    				<div className="relative">
    					<Input
    						type="text"
    						value={query}
    						onChange={(e) => setQuery(e.target.value)}
    						placeholder="Search for books..."
    						className="w-full p-2 my-4"
    					/>
    					{loading && (
    						<div className="absolute w-full bg-white border rounded mt-1 p-2 shadow-lg">
    							<ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
    						</div>
    					)}
    					{!loading && !loadingBook && books.length > 0 && (
    						<ul className="absolute w-full bg-white border rounded mt-1 shadow-lg max-h-60 overflow-y-auto">
    							{books.map((book) => (
    								<li
    									key={book.id}
    									className="p-2 flex justify-between gap-1 hover:bg-gray-100 cursor-pointer"
    									onClick={() => addBook(book)}
    									onKeyDown={(e) => {
    										if (e.key === "Enter" || e.key === " ") {
    											e.preventDefault();
    											addBook(book);
    										}
    									}}
    								>
    									<div className="flex flex-col gap-1">
    										<p>{book.volumeInfo.title}</p>
    										<p className="text-xs">{book.volumeInfo.authors}</p>
    									</div>
    									<img
    										src={book.volumeInfo.imageLinks?.thumbnail}
    										alt={book.id.toString()}
    										className="max-h-16"
    									/>
    								</li>
    							))}
    						</ul>
    					)}
    					{loadingBook && (
    						<div className="flex flex-row items-center">
    							<ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
    							<p>Adding...</p>
    						</div>
    					)}
    				</div>
    			</DialogContent>
    		</Dialog>
    	);
    }
    
    

There’s a lot of code here, but mostly because I went a bit hard and wanted a good UX for adding books. Instead of putting all the information of a book in manually, we’ll use the Google books API instead. We do this by using `useEffect` and `useState` that will update the search results anytime the `query` state is altered, so we get a pretty nice effect that, as you type, you’ll see book results. One of the key pieces of this listing is that the `<li>` element has an `onClick` callback, which will trigger our `addBook` function and pass in the selected `book` object.

In the `addBook` function, we take the book data provided from the API, the use, and then pass it into an API call to `/api/book`, but we don’t have that endpoint created yet. Let’s do that now following the same pattern as earlier with shelves, so the file will be `app/api/book/route.ts`.

    import type { NextRequest } from "next/server";
    import { NextResponse } from "next/server";
    import { pinata } from "@/lib/pinata";
    import { drizzle } from "drizzle-orm/pglite";
    import { restoreSnapshot, bookshelf } from "@/lib/db";
    
    export async function POST(request: NextRequest) {
    	const data = await request.json();
    	try {
    		const client = await restoreSnapshot(data.groupId);
    		if (client) {
    			const db = drizzle(client);
    			await db.insert(bookshelf).values({
    				title: data.title,
    				author: data.author,
    				image_url: data.image_url,
    			});
    			const newFile = (await client.dumpDataDir("auto")) as File;
    			const upload = await pinata.upload.file(newFile).group(data.groupId);
    			console.log(upload);
    
    			return NextResponse.json({ id: upload.group_id }, { status: 200 });
    		}
    	} catch (error) {
    		console.log(error);
    		return NextResponse.json(
    			{ error: "Internal Server Error" },
    			{ status: 500 },
    		);
    	}
    }
    

Our API endpoint here is also pretty simple. First, we parse the JSON body sent in the API request, then use it to insert a new row into the database. Then, we dump the database again and upload the new version to Pinata and send back the `group_id`. Again, we could probably alter this structure a bit to be a little more efficient, but the unique piece being achieved here is a fully versioned history of the database. Pinata’s File API is unique in that it uses content addressing to hash all content uploaded so, if you upload a file twice, you’ll get the same hash twice and the duplicate file will be skipped. With this database setup, you get to have that hashed version control, which could be useful in many other circumstances outside a simply book app, but you get the idea! :)

With all of these files in place, you should get a pretty slick app that can be built out further to include things like a share link button, which I’ve included in the full live repo that you can check out [here](https://github.com/PinataCloud/bookshelf-studio?ref=pinata.cloud)
.

Wrapping Up
-----------

PGLite really is a unique piece of tech, and I think we really only scratched the surface here. We used it in a serverless setup, but its real power is how it can be used in the client. There are apps out there, like Excalidraw, that could really be opened up due it’s ability to run in the browser; working with local databases, exporting them locally, or perhaps even archiving them with hashing and versioning like we did in this tutorial!

Check out some of the [other stuff we’ve built recently](https://pinata.cloud/blog?ref=pinata.cloud)
 or check out our [docs](https://docs.pinata.cloud/?ref=pinata.cloud)
 to see what else is possible with Pinata. [Sign up for a free account and start building!](https://pinata.cloud/pricing?ref=pinata.cloud)

[![Subscribe to paid plan image](https://mktg.mypinata.cloud/ipfs/QmX7pwox4nPUBnRM3M6qYtbNynb894z8TnukzxjizJRqq7)](https://pinata.cloud/pricing)

Share this post:

### Stay up to date

Join our newsletter for the latest stories & product updates from the Pinata community.
=======================================================================================

Submit

Error submitting email.

Success! Please confirm your email within 24 hours.